import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { useLookups } from "@/features/lookups/useLookups";
import { useI18n } from "@/shared/i18n";
import { expensesApi } from "@/features/finance/expenses/api";
import { isApiError } from "@/shared/api/errors";
import type { ExpenseLine } from "@/features/finance/expenses/types";
import { formatMoney, toDateInput } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

export function ExpensePaymentDialog({
  line,
  onOpenChange,
}: {
  line: ExpenseLine;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const lookups = useLookups();
  const methods = lookups.list("paymentMethods");
  const approved = line.payments
    .filter((payment) => payment.approvedAt && !payment.rejectionReason)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, line.totalAmount - approved);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [date, setDate] = useState(toDateInput(new Date()));
  const [methodId, setMethodId] = useState<number | null>(null);
  const method = methods.find((item) => item.id === methodId) ?? methods[0];
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      expensesApi.createPayment({
        expenseLineId: line.id,
        amount: Number(amount),
        paymentDate: new Date(`${date}T12:00:00`).toISOString(),
        paymentMethodId: method?.id ?? 0,
        paymentReference: reference.trim() || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("expenses.paymentSubmitted"));
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
    },
    onError: (reason) => setError(isApiError(reason) ? reason.message : (reason as Error).message),
  });
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!(Number(amount) > 0) || Number(amount) - remaining > 0.009 || !date || !method) {
              setError(t("expenses.invalidPayment"));
              return;
            }
            setError(null);
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("expenses.addPayment")}</DialogTitle>
            <DialogDescription>
              {t("expenses.paymentHint", {
                amount: formatMoney(remaining, locale, line.currencySymbol),
              })}
            </DialogDescription>
          </DialogHeader>
          {error && <FormError>{error}</FormError>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("common.amount")} type="number" value={amount} onChange={setAmount} />
            <Field label={t("common.date")} type="date" value={date} onChange={setDate} />
            <label className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">
                {t("expenses.paymentMethod")}
              </span>
              <AppSelect
                value={method?.id ?? ""}
                onChange={(event) => setMethodId(Number(event.target.value))}
                className="w-full"
              >
                {methods.map((item) => (
                  <option key={item.id} value={item.id}>
                    {lookups.label("paymentMethods", item)}
                  </option>
                ))}
              </AppSelect>
            </label>
            <Field label={t("expenses.reference")} value={reference} onChange={setReference} />
          </div>
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("common.notes")}
            </span>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full"
            />
          </label>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)} variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {t("expenses.submitPayment")}
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
        min={type === "number" ? "0.01" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      />
    </label>
  );
}
