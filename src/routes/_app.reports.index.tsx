import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/DataStates";
import { RequirePermission } from "@/components/common/RequirePermission";
import { Card, CardHeader } from "@/components/common/Surface";
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
type ReportsSearch = {
  report?: ReportId | undefined;
  date?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  branch?: number | undefined;
  employee?: number | undefined;
  delivery?: number | undefined;
  customer?: string | undefined;
  categoryGroup?: number | undefined;
  category?: number | undefined;
};
const REPORTS: { id: ReportId; label: string; description: string }[] = [
  { id: "stock-on-hand", label: "reports.stockOnHand", description: "reports.stockOnHandHint" },
  { id: "low-stock", label: "reports.lowStock", description: "reports.lowStockHint" },
  { id: "daily-sales", label: "reports.dailySales", description: "reports.dailySalesHint" },
  { id: "monthly-sales", label: "reports.salesRange", description: "reports.salesRangeHint" },
  {
    id: "branch-performance",
    label: "reports.branchPerformance",
    description: "reports.branchPerformanceHint",
  },
  {
    id: "staff-performance",
    label: "reports.staffPerformance",
    description: "reports.staffPerformanceHint",
  },
  { id: "orders", label: "reports.orders", description: "reports.ordersHint" },
  { id: "deliveries", label: "reports.deliveries", description: "reports.deliveriesHint" },
  { id: "customers", label: "reports.customers", description: "reports.customersHint" },
  { id: "expenses", label: "reports.expenses", description: "reports.expensesHint" },
];

export const Route = createFileRoute("/_app/reports/")({
  validateSearch: (raw: Record<string, unknown>): ReportsSearch => ({
    report: REPORTS.some((item) => item.id === raw["report"])
      ? (raw["report"] as ReportId)
      : undefined,
    date: typeof raw["date"] === "string" && raw["date"] ? raw["date"] : undefined,
    from: typeof raw["from"] === "string" && raw["from"] ? raw["from"] : undefined,
    to: typeof raw["to"] === "string" && raw["to"] ? raw["to"] : undefined,
    branch: Number(raw["branch"]) > 0 ? Number(raw["branch"]) : undefined,
    employee: Number(raw["employee"]) > 0 ? Number(raw["employee"]) : undefined,
    delivery: Number(raw["delivery"]) > 0 ? Number(raw["delivery"]) : undefined,
    customer: typeof raw["customer"] === "string" && raw["customer"] ? raw["customer"] : undefined,
    categoryGroup: Number(raw["categoryGroup"]) > 0 ? Number(raw["categoryGroup"]) : undefined,
    category: Number(raw["category"]) > 0 ? Number(raw["category"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reports — Stockify" },
      {
        name: "description",
        content:
          "Export Stockify inventory, sales, branch, staff, order, customer and expense workbooks.",
      },
      { property: "og:title", content: "Reports — Stockify" },
      { property: "og:description", content: "Operational Excel exports for Stockify." },
    ],
  }),
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
  const url = Route.useSearch();
  const navigate = Route.useNavigate();
  const today = toDateInput(new Date());
  const monthStart = `${today.slice(0, 8)}01`;
  const [report, setReport] = useState<ReportId>(url.report ?? "stock-on-hand");
  const [date, setDate] = useState(url.date ?? today);
  const [startDate, setStartDate] = useState(url.from ?? monthStart);
  const [endDate, setEndDate] = useState(url.to ?? today);
  const [branchId, setBranchId] = useState<number | null>(url.branch ?? null);
  const [employeeId, setEmployeeId] = useState<number | null>(url.employee ?? null);
  const [deliveryId, setDeliveryId] = useState<number | null>(url.delivery ?? null);
  const [customerId, setCustomerId] = useState(url.customer ?? "");
  const [categoryGroupId, setCategoryGroupId] = useState<number | null>(url.categoryGroup ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(url.category ?? null);
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
  useEffect(() => {
    void navigate({
      search: {
        report,
        date,
        from: startDate,
        to: endDate,
        branch: branchId ?? undefined,
        employee: employeeId ?? undefined,
        delivery: deliveryId ?? undefined,
        customer: customerId || undefined,
        categoryGroup: categoryGroupId ?? undefined,
        category: categoryId ?? undefined,
      },
      replace: true,
    });
  }, [
    report,
    date,
    startDate,
    endDate,
    branchId,
    employeeId,
    deliveryId,
    customerId,
    categoryGroupId,
    categoryId,
    navigate,
  ]);
  const needsRange = [
    "monthly-sales",
    "branch-performance",
    "staff-performance",
    "orders",
    "customers",
    "expenses",
  ].includes(report);
  const needsBranch = ["daily-sales", "monthly-sales", "branch-performance", "expenses"].includes(
    report,
  );
  const exportReport = useMutation({
    mutationFn: async () => {
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
      if (report === "monthly-sales") query["branchId"] = branchId;
      if (report === "branch-performance") query["branchId"] = branchId;
      if (report === "staff-performance") query["employeeId"] = employeeId;
      if (report === "deliveries") query["deliveryLocationId"] = deliveryId;
      if (report === "customers") query["customerId"] = customerId ? Number(customerId) : undefined;
      if (report === "expenses") {
        query["from"] = startDate || undefined;
        query["to"] = endDate || undefined;
        query["categoryId"] = categoryId;
        query["branchId"] = branchId;
      }
      await reportsApi.download(report, query);
    },
    onSuccess: () => toast.success(t("reports.downloadStarted")),
  });
  const selected = REPORTS.find((item) => item.id === report)!;
  const submit = () => {
    const invalid =
      (report === "daily-sales" && !date) ||
      (["monthly-sales", "branch-performance", "staff-performance", "orders", "customers"].includes(
        report,
      ) &&
        !startDate) ||
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
      <div>
        <h1 className="text-lg font-semibold">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("reports.chooseReport")} />
          <nav className="space-y-1 p-2" aria-label={t("reports.chooseReport")}>
            {REPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setReport(item.id);
                  setValidation(null);
                  exportReport.reset();
                }}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-start ${report === item.id ? "bg-primary-soft text-primary" : "hover:bg-muted"}`}
              >
                <FileSpreadsheet className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">{t(item.label)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(item.description)}
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </Card>
        <Card className="h-fit">
          <CardHeader title={t(selected.label)} description={t(selected.description)} />
          <div className="space-y-4 p-5">
            {validation && (
              <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">
                {validation}
              </p>
            )}
            {exportReport.isError && <ErrorState error={exportReport.error} onRetry={submit} />}
            {report === "daily-sales" && (
              <Field label={t("common.date")} type="date" value={date} onChange={setDate} />
            )}
            {needsRange && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t(report === "expenses" ? "common.from" : "reports.startDate")}
                  type="date"
                  value={startDate}
                  onChange={setStartDate}
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
            <div className="rounded-lg border border-border bg-surface-sunken p-3 text-xs text-muted-foreground">
              {t("reports.xlsxHint")}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={exportReport.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {exportReport.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("reports.downloadXlsx")}
            </button>
          </div>
        </Card>
      </div>
    </div>
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
  type?: "text" | "date" | "number";
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium">{label}</span>
      <input
        type={type}
        min={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
    <label className="block space-y-1">
      <span className="text-xs font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
