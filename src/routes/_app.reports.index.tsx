import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Download,
  Loader2,
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

import { AppSelect } from "@/components/common/AppSelect";
import { ErrorState } from "@/components/common/DataStates";
import { RequirePermission } from "@/components/common/RequirePermission";
import { PageHeader } from "@/components/common/Surface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TAB } from "@/features/auth/permissions";
import { branchesQuery, deliveryChargesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { employeesApi, expensesApi, reportsApi } from "@/lib/api/endpoints";
import type { QueryValue } from "@/lib/api/endpoints";
import { toDateInput } from "@/lib/format";

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

export const Route = createFileRoute("/_app/reports/")({
  component: ReportsRoute,
});

function ReportsRoute() {
  return (
    <RequirePermission permission={TAB.reports}>
      <ReportsScreen />
    </RequirePermission>
  );
}

function ReportsScreen() {
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
    <div className="space-y-6">
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        aria-label={t("reports.chooseReport")}
      >
        {REPORTS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openReport(item.id)}
              className="group flex min-h-44 flex-col rounded-2xl border border-border/80 bg-card p-5 text-start shadow-[0_1px_2px_oklch(0_0_0/0.035)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-7 text-primary" />
              <span className="mt-5 text-base font-semibold text-foreground">{t(item.label)}</span>
              <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {t(item.description)}
              </span>
              <ChevronRight className="mt-auto size-4 self-end text-primary transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
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
          <DialogContent className="max-w-xl">
            <DialogHeader className="pe-8 text-start">
              <DialogTitle>{t(selected.label)}</DialogTitle>
              <DialogDescription>{t(selected.description)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {validation && (
                <p className="rounded-xl border border-destructive/20 bg-error-soft px-3.5 py-3 text-sm text-destructive">
                  {validation}
                </p>
              )}
              {exportReport.isError && <ErrorState error={exportReport.error} onRetry={submit} />}

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
                <div className="grid gap-3 sm:grid-cols-2">
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
                <div className="grid gap-3 sm:grid-cols-2">
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

              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("reports.xlsxHint")}
              </p>

              <button
                type="button"
                onClick={submit}
                disabled={exportReport.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/15 transition hover:bg-primary/90 disabled:opacity-50"
              >
                {exportReport.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {t("reports.downloadXlsx")}
              </button>
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
    <label className="block space-y-2">
      <span className="text-sm font-semibold">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        min={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
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
    <label className="block space-y-2">
      <span className="text-sm font-semibold">
        {label}
        {required ? " *" : ""}
      </span>
      <AppSelect
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
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
