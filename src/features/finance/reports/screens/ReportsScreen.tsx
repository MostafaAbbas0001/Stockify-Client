import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Download,
  PackageCheck,
  PackageMinus,
  Truck,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ErrorState } from "@/shared/components/DataStates";
import { PageHeader } from "@/shared/components/Surface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { branchesQuery } from "@/features/settings/branches/queries";
import { deliveryChargesQuery } from "@/features/settings/delivery-locations/queries";
import { useI18n } from "@/shared/i18n";
import { expensesApi } from "@/features/finance/expenses/api";
import { reportsApi } from "@/features/finance/reports/api";
import { employeesApi } from "@/features/people/employees/api";
import type { QueryValue } from "@/shared/api/download";
import { toDateInput } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

type ReportId =
  | "stock-on-hand"
  | "low-stock"
  | "daily-sales"
  | "monthly-sales"
  | "branch-performance"
  | "staff-performance"
  | "orders"
  | "deliveries"
  | "customers"
  | "expenses";

type ReportDefinition = {
  id: ReportId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const REPORTS: ReportDefinition[] = [
  {
    id: "stock-on-hand",
    label: "reports.stockOnHand",
    description: "reports.stockOnHandHint",
    icon: PackageCheck,
  },
  {
    id: "low-stock",
    label: "reports.lowStock",
    description: "reports.lowStockHint",
    icon: PackageMinus,
  },
  {
    id: "daily-sales",
    label: "reports.dailySales",
    description: "reports.dailySalesHint",
    icon: CalendarDays,
  },
  {
    id: "monthly-sales",
    label: "reports.salesRange",
    description: "reports.salesRangeHint",
    icon: CalendarRange,
  },
  {
    id: "branch-performance",
    label: "reports.branchPerformance",
    description: "reports.branchPerformanceHint",
    icon: Building2,
  },
  {
    id: "staff-performance",
    label: "reports.staffPerformance",
    description: "reports.staffPerformanceHint",
    icon: UserRoundCheck,
  },
  {
    id: "orders",
    label: "reports.orders",
    description: "reports.ordersHint",
    icon: ClipboardList,
  },
  {
    id: "deliveries",
    label: "reports.deliveries",
    description: "reports.deliveriesHint",
    icon: Truck,
  },
  {
    id: "customers",
    label: "reports.customers",
    description: "reports.customersHint",
    icon: UsersRound,
  },
  {
    id: "expenses",
    label: "reports.expenses",
    description: "reports.expensesHint",
    icon: WalletCards,
  },
];

export function ReportsScreen() {
  const { t } = useI18n();
  const today = toDateInput(new Date());
  const monthStart = `${today.slice(0, 8)}01`;
  const [report, setReport] = useState<ReportId | null>(null);
  const [date, setDate] = useState(today);
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [deliveryId, setDeliveryId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [categoryGroupId, setCategoryGroupId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  const branches = useQuery(branchesQuery());
  const deliveries = useQuery(deliveryChargesQuery());
  const employees = useQuery({
    queryKey: ["employees", "report-options"],
    queryFn: () => employeesApi.list({ isSale: true, page: 1 }),
  });
  const categoryGroups = useQuery({
    queryKey: ["expenses", "categories", "report-options"],
    queryFn: () => expensesApi.categories(),
  });
  const categories = useQuery({
    queryKey: ["expenses", "categories", "report-options", categoryGroupId],
    queryFn: () => expensesApi.categories(categoryGroupId!),
    enabled: Boolean(categoryGroupId),
  });

  const selected = REPORTS.find((item) => item.id === report) ?? null;
  const needsRange =
    report !== null &&
    [
      "monthly-sales",
      "branch-performance",
      "staff-performance",
      "orders",
      "customers",
      "expenses",
    ].includes(report);
  const needsBranch =
    report !== null &&
    ["daily-sales", "monthly-sales", "branch-performance", "expenses"].includes(report);

  const exportReport = useMutation({
    mutationFn: async () => {
      if (!report) throw new Error("No report selected.");

      const query: Record<string, QueryValue> = {};
      if (report === "daily-sales") {
        query["date"] = date;
        query["branchId"] = branchId;
      }
      if (
        [
          "monthly-sales",
          "branch-performance",
          "staff-performance",
          "orders",
          "customers",
        ].includes(report)
      ) {
        query["startDate"] = startDate;
        query["endDate"] = endDate || undefined;
      }
      if (report === "monthly-sales" || report === "branch-performance") {
        query["branchId"] = branchId;
      }
      if (report === "staff-performance") query["employeeId"] = employeeId;
      if (report === "deliveries") query["deliveryLocationId"] = deliveryId;
      if (report === "customers") {
        query["customerId"] = customerId ? Number(customerId) : undefined;
      }
      if (report === "expenses") {
        query["from"] = startDate || undefined;
        query["to"] = endDate || undefined;
        query["categoryId"] = categoryId;
        query["branchId"] = branchId;
      }

      await reportsApi.download(report, query);
    },
    onSuccess: () => {
      toast.success(t("reports.downloadStarted"));
      setReport(null);
    },
  });

  const openReport = (id: ReportId) => {
    setReport(id);
    setValidation(null);
    exportReport.reset();
  };

  const submit = () => {
    if (!report) return;

    const requiresStartDate = [
      "monthly-sales",
      "branch-performance",
      "staff-performance",
      "orders",
      "customers",
    ].includes(report);
    const invalid =
      (report === "daily-sales" && !date) ||
      (requiresStartDate && !startDate) ||
      (report === "branch-performance" && !branchId) ||
      (report === "staff-performance" && !employeeId) ||
      (startDate && endDate && endDate < startDate);

    if (invalid) {
      setValidation(t("reports.invalid"));
      return;
    }

    setValidation(null);
    exportReport.mutate();
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label={t("reports.chooseReport")}
      >
        {REPORTS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openReport(item.id)}
              className="group flex min-h-36 flex-col items-start rounded-surface border border-border bg-card p-4 text-start shadow-card transition-colors hover:border-border-strong"
            >
              <span className="grid size-10 place-items-center rounded-control bg-muted text-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="mt-3 text-body-lg font-semibold text-foreground">
                {t(item.label)}
              </span>
              <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {t(item.description)}
              </span>
              <span className="mt-auto flex w-full items-center justify-end gap-1.5 pt-3 text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {t("reports.downloadXlsx")}
                <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
              </span>
            </button>
          );
        })}
      </section>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setReport(null);
            setValidation(null);
            exportReport.reset();
          }
        }}
      >
        {selected && (
          <DialogContent size="xl">
            <DialogHeader>
              <DialogTitle>{t(selected.label)}</DialogTitle>
              <DialogDescription>{t(selected.description)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <FormError>{validation}</FormError>
              {exportReport.isError && (
                <div className="rounded-control border border-border">
                  <ErrorState error={exportReport.error} onRetry={submit} />
                </div>
              )}

              {report === "daily-sales" && (
                <Field
                  label={t("common.date")}
                  type="date"
                  value={date}
                  onChange={setDate}
                  required
                />
              )}

              {needsRange && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t(report === "expenses" ? "common.from" : "reports.startDate")}
                    type="date"
                    value={startDate}
                    onChange={setStartDate}
                    required={report !== "expenses"}
                  />
                  <Field
                    label={t(report === "expenses" ? "common.to" : "reports.endDate")}
                    type="date"
                    value={endDate}
                    onChange={setEndDate}
                  />
                </div>
              )}

              {needsBranch && (
                <Select
                  label={t("common.branch")}
                  value={branchId}
                  onChange={setBranchId}
                  required={report === "branch-performance"}
                  options={(branches.data ?? []).map((branch) => ({
                    id: branch.id,
                    name: branch.name,
                  }))}
                  allLabel={
                    report === "branch-performance"
                      ? t("reports.selectBranch")
                      : t("common.allBranches")
                  }
                />
              )}

              {report === "staff-performance" && (
                <Select
                  label={t("common.employee")}
                  value={employeeId}
                  onChange={setEmployeeId}
                  required
                  options={(employees.data?.items ?? []).map((employee) => ({
                    id: employee.id,
                    name: employee.name,
                  }))}
                  allLabel={t("reports.selectEmployee")}
                />
              )}

              {report === "deliveries" && (
                <Select
                  label={t("common.delivery")}
                  value={deliveryId}
                  onChange={setDeliveryId}
                  options={(deliveries.data ?? []).map((delivery) => ({
                    id: delivery.id,
                    name: delivery.locationName,
                  }))}
                  allLabel={t("reports.allLocations")}
                />
              )}

              {report === "customers" && (
                <Field
                  label={t("reports.customerId")}
                  type="number"
                  value={customerId}
                  onChange={setCustomerId}
                />
              )}

              {report === "expenses" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label={t("expenses.headerCategory")}
                    value={categoryGroupId}
                    onChange={(value) => {
                      setCategoryGroupId(value);
                      setCategoryId(null);
                    }}
                    options={(categoryGroups.data ?? []).map((category) => ({
                      id: category.id,
                      name: category.name,
                    }))}
                    allLabel={t("expenses.allCategories")}
                  />
                  <Select
                    label={t("expenses.lineCategory")}
                    value={categoryId}
                    onChange={setCategoryId}
                    options={(categories.data ?? []).map((category) => ({
                      id: category.id,
                      name: category.name,
                    }))}
                    allLabel={t("expenses.allLineCategories")}
                  />
                </div>
              )}

              <p className="text-[13px] text-muted-foreground">{t("reports.xlsxHint")}</p>

              <Button
                size="lg"
                onClick={submit}
                loading={exportReport.isPending}
                className="w-full"
              >
                {!exportReport.isPending && <Download className="size-4" />}
                {t("reports.downloadXlsx")}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
      </span>
      <Input
        type={type}
        min={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
  required = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  options: { id: number; name: string }[];
  allLabel: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
      </span>
      <AppSelect
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="w-full"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </AppSelect>
    </label>
  );
}
