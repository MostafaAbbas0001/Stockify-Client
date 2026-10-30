import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { AppSelect } from "@/shared/components/AppSelect";
import { ExpenseLineTypeCode } from "@/features/lookups/codes";
import { useLookups } from "@/features/lookups/useLookups";
import { branchesQuery } from "@/features/settings/branches/queries";
import { currenciesQuery } from "@/features/settings/currencies/queries";
import { useI18n } from "@/shared/i18n";
import { expensesApi } from "@/features/finance/expenses/api";
import { employeesApi } from "@/features/people/employees/api";
import { isApiError } from "@/shared/api/errors";
import type { CreateExpenseLineRequest } from "@/features/finance/expenses/types";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

type DraftLine = {
  key: number;
  categoryId: number | null;
  /** Expense line type code; decides which inputs the line shows and how the server totals it. */
  mode: string;
  amount: string;
  rate: string;
  quantity: string;
  unitCost: string;
  employeeId: number | null;
  currencyId: number | null;
  branchId: number | null;
  startDate: string;
  endDate: string;
  periodStart: string;
  periodEnd: string;
  itemName: string;
  supplierName: string;
  referenceNumber: string;
  note: string;
};

let nextKey = 1;
function emptyLine(): DraftLine {
  return {
    key: nextKey++,
    categoryId: null,
    mode: ExpenseLineTypeCode.Amount,
    amount: "",
    rate: "",
    quantity: "",
    unitCost: "",
    employeeId: null,
    currencyId: null,
    branchId: null,
    startDate: "",
    endDate: "",
    periodStart: "",
    periodEnd: "",
    itemName: "",
    supplierName: "",
    referenceNumber: "",
    note: "",
  };
}

function usesRate(mode: string): boolean {
  return mode === ExpenseLineTypeCode.Fixed || mode === ExpenseLineTypeCode.Percentage;
}

function optionalNumber(value: string): number | null {
  return value.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: number) => void;
}) {
  const { t } = useI18n();
  const lookups = useLookups();
  const queryClient = useQueryClient();
  const [rootCategoryId, setRootCategoryId] = useState<number | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const roots = useQuery({
    queryKey: ["expenses", "categories", "roots"],
    queryFn: () => expensesApi.categories(),
  });
  const categories = useQuery({
    queryKey: ["expenses", "categories", rootCategoryId],
    queryFn: () => expensesApi.categories(rootCategoryId!),
    enabled: Boolean(rootCategoryId),
  });
  const branches = useQuery(branchesQuery());
  const currencies = useQuery(currenciesQuery());
  const employees = useQuery({
    queryKey: ["employees", "expense-form"],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  useEffect(() => {
    const first = categories.data?.[0]?.id;
    if (!first) return;
    setLines((current) => current.map((line) => ({ ...line, categoryId: first })));
  }, [categories.data]);

  const updateLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const save = useMutation({
    mutationFn: () => {
      const requestLines: CreateExpenseLineRequest[] = lines.map((line) => ({
        categoryId: line.categoryId!,
        amount: line.mode === ExpenseLineTypeCode.Amount ? Number(line.amount) : 0,
        lineTypeId: lookups.byCode("expenseLineTypes", line.mode)?.id ?? null,
        rate: usesRate(line.mode) ? optionalNumber(line.rate) : null,
        quantity: line.mode === ExpenseLineTypeCode.Quantity ? optionalNumber(line.quantity) : null,
        unitCost: line.mode === ExpenseLineTypeCode.Quantity ? optionalNumber(line.unitCost) : null,
        employeeId: line.mode === ExpenseLineTypeCode.Percentage ? line.employeeId : null,
        currencyId: line.currencyId,
        branchId: line.branchId,
        startDate:
          line.mode === ExpenseLineTypeCode.Percentage && line.startDate ? line.startDate : null,
        endDate: line.mode === ExpenseLineTypeCode.Percentage && line.endDate ? line.endDate : null,
        expensePeriodStart: line.periodStart || null,
        expensePeriodEnd: line.periodEnd || null,
        itemName: line.itemName.trim() || null,
        supplierName: line.supplierName.trim() || null,
        referenceNumber: line.referenceNumber.trim() || null,
        note: line.note.trim() || null,
      }));
      return expensesApi.create({
        expenseDate: new Date().toISOString(),
        expenseCategoryId: rootCategoryId!,
        lines: requestLines,
      });
    },
    onSuccess: (result) => {
      toast.success(t("expenses.created"));
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
      onCreated(result.id);
    },
    onError: (reason) =>
      setError(
        isApiError(reason)
          ? (Object.values(reason.fieldErrors ?? {})[0]?.[0] ?? reason.message)
          : (reason as Error).message,
      ),
  });

  const valid = () =>
    rootCategoryId &&
    lines.length > 0 &&
    lines.every((line) => {
      if (!line.categoryId) return false;
      if (line.mode === ExpenseLineTypeCode.Amount) return Number(line.amount) > 0;
      if (line.mode === ExpenseLineTypeCode.Fixed) return Number(line.rate) > 0;
      if (line.mode === ExpenseLineTypeCode.Quantity) {
        return Number(line.quantity) > 0 && Number(line.unitCost) > 0;
      }
      return (
        Number(line.rate) > 0 &&
        Boolean(line.employeeId && line.startDate && line.endDate && line.endDate >= line.startDate)
      );
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="4xl">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid()) {
              setError(t("expenses.invalid"));
              return;
            }
            setError(null);
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("expenses.newExpense")}</DialogTitle>
            <DialogDescription>{t("expenses.formHint")}</DialogDescription>
          </DialogHeader>
          {error && <FormError>{error}</FormError>}
          <label className="block max-w-sm space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("expenses.headerCategory")}
            </span>
            <AppSelect
              value={rootCategoryId ?? ""}
              onChange={(event) => {
                setRootCategoryId(event.target.value ? Number(event.target.value) : null);
                setLines([emptyLine()]);
              }}
              className="w-full"
            >
              <option value="">{t("expenses.selectCategory")}</option>
              {(roots.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.code ? `${category.code} – ` : ""}
                  {category.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <section key={line.key} className="rounded-control border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {t("expenses.lineNumber", { number: index + 1 })}
                  </h3>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      onClick={() =>
                        setLines((current) => current.filter((item) => item.key !== line.key))
                      }
                      aria-label={t("common.delete")}
                      variant="quiet-destructive"
                      size="icon-sm"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block space-y-1.5">
                    <span className="block text-[13px] font-medium text-foreground">
                      {t("expenses.lineCategory")}
                    </span>
                    <AppSelect
                      value={line.categoryId ?? ""}
                      onChange={(event) =>
                        updateLine(line.key, {
                          categoryId: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                      className="w-full"
                    >
                      <option value="">{t("expenses.selectCategory")}</option>
                      {(categories.data ?? []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.code ? `${category.code} – ` : ""}
                          {category.name}
                        </option>
                      ))}
                    </AppSelect>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="block text-[13px] font-medium text-foreground">
                      {t("expenses.calculation")}
                    </span>
                    <AppSelect
                      value={line.mode}
                      onChange={(event) => updateLine(line.key, { mode: event.target.value })}
                      className="w-full"
                    >
                      {lookups.list("expenseLineTypes").map((type) => (
                        <option key={type.id} value={type.code}>
                          {lookups.label("expenseLineTypes", type)}
                        </option>
                      ))}
                    </AppSelect>
                  </label>
                  {line.mode === ExpenseLineTypeCode.Amount && (
                    <Field
                      label={t("common.amount")}
                      type="number"
                      value={line.amount}
                      onChange={(amount) => updateLine(line.key, { amount })}
                    />
                  )}
                  {usesRate(line.mode) && (
                    <Field
                      label={
                        line.mode === ExpenseLineTypeCode.Percentage
                          ? t("expenses.ratePercent")
                          : t("common.amount")
                      }
                      type="number"
                      value={line.rate}
                      onChange={(rate) => updateLine(line.key, { rate })}
                    />
                  )}
                  {line.mode === ExpenseLineTypeCode.Quantity && (
                    <>
                      <Field
                        label={t("expenses.quantity")}
                        type="number"
                        value={line.quantity}
                        onChange={(quantity) => updateLine(line.key, { quantity })}
                      />
                      <Field
                        label={t("expenses.unitCost")}
                        type="number"
                        value={line.unitCost}
                        onChange={(unitCost) => updateLine(line.key, { unitCost })}
                      />
                    </>
                  )}
                  {line.mode === ExpenseLineTypeCode.Percentage && (
                    <>
                      <label className="block space-y-1.5">
                        <span className="block text-[13px] font-medium text-foreground">
                          {t("common.employee")}
                        </span>
                        <AppSelect
                          value={line.employeeId ?? ""}
                          onChange={(event) =>
                            updateLine(line.key, {
                              employeeId: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                          className="w-full"
                        >
                          <option value="">{t("expenses.selectEmployee")}</option>
                          {(employees.data?.items ?? []).map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </AppSelect>
                      </label>
                      <Field
                        label={t("common.from")}
                        type="date"
                        value={line.startDate}
                        onChange={(startDate) => updateLine(line.key, { startDate })}
                      />
                      <Field
                        label={t("common.to")}
                        type="date"
                        value={line.endDate}
                        onChange={(endDate) => updateLine(line.key, { endDate })}
                      />
                    </>
                  )}
                  <label className="block space-y-1.5">
                    <span className="block text-[13px] font-medium text-foreground">
                      {t("common.currency")}
                    </span>
                    <AppSelect
                      value={line.currencyId ?? ""}
                      onChange={(event) =>
                        updateLine(line.key, {
                          currencyId: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                      className="w-full"
                    >
                      <option value="">{t("common.none")}</option>
                      {(currencies.data ?? []).map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code}
                        </option>
                      ))}
                    </AppSelect>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="block text-[13px] font-medium text-foreground">
                      {t("common.branch")}
                    </span>
                    <AppSelect
                      value={line.branchId ?? ""}
                      onChange={(event) =>
                        updateLine(line.key, {
                          branchId: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                      className="w-full"
                    >
                      <option value="">{t("common.none")}</option>
                      {(branches.data ?? []).map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </AppSelect>
                  </label>
                  <Field
                    label={t("expenses.periodStart")}
                    type="date"
                    value={line.periodStart}
                    onChange={(periodStart) => updateLine(line.key, { periodStart })}
                  />
                  <Field
                    label={t("expenses.periodEnd")}
                    type="date"
                    value={line.periodEnd}
                    onChange={(periodEnd) => updateLine(line.key, { periodEnd })}
                  />
                  <Field
                    label={t("expenses.itemName")}
                    value={line.itemName}
                    onChange={(itemName) => updateLine(line.key, { itemName })}
                  />
                  <Field
                    label={t("expenses.supplier")}
                    value={line.supplierName}
                    onChange={(supplierName) => updateLine(line.key, { supplierName })}
                  />
                  <Field
                    label={t("expenses.reference")}
                    value={line.referenceNumber}
                    onChange={(referenceNumber) => updateLine(line.key, { referenceNumber })}
                  />
                  <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <span className="block text-[13px] font-medium text-foreground">
                      {t("common.notes")}
                    </span>
                    <Textarea
                      value={line.note}
                      onChange={(event) => updateLine(line.key, { note: event.target.value })}
                      className="w-full"
                    />
                  </label>
                </div>
              </section>
            ))}
          </div>
          <Button
            type="button"
            disabled={!rootCategoryId}
            onClick={() =>
              setLines((current) => [
                ...current,
                { ...emptyLine(), categoryId: categories.data?.[0]?.id ?? null },
              ])
            }
            variant="outline"
            size="sm"
          >
            <Plus className="size-4" />
            {t("expenses.addLine")}
          </Button>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)} variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={save.isPending || roots.isPending}
              loading={save.isPending}
            >
              {t("expenses.createExpense")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-medium text-foreground">{label}</span>
      <Input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      />
    </label>
  );
}
