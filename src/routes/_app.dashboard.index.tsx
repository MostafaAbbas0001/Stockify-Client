import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Boxes, CircleDollarSign, ReceiptText, ShoppingBasket } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { RequirePermission } from "@/components/common/RequirePermission";
import { Card, CardHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { TAB } from "@/features/auth/permissions";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { dashboardApi, ordersApi } from "@/lib/api/endpoints";
import type { Branch, BranchPerformance } from "@/lib/api/types";
import { endOfDayIso, formatMoney, formatNumber, startOfDayIso, toDateInput } from "@/lib/format";

type DashboardSearch = {
  from?: string | undefined;
  to?: string | undefined;
  branch?: number | undefined;
};
export const Route = createFileRoute("/_app/dashboard/")({
  validateSearch: (raw: Record<string, unknown>): DashboardSearch => ({
    from: typeof raw["from"] === "string" && raw["from"] ? raw["from"] : undefined,
    to: typeof raw["to"] === "string" && raw["to"] ? raw["to"] : undefined,
    branch: Number(raw["branch"]) > 0 ? Number(raw["branch"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dashboard — Stockify" },
      {
        name: "description",
        content: "Stockify sales, basket, outstanding balance and branch performance dashboard.",
      },
      { property: "og:title", content: "Dashboard — Stockify" },
      {
        property: "og:description",
        content: "Retail performance and inventory health at a glance.",
      },
    ],
  }),
  component: DashboardRoute,
});
function DashboardRoute() {
  return (
    <RequirePermission permission={TAB.dashboard}>
      <DashboardScreen />
    </RequirePermission>
  );
}

async function loadBranchPerformance(
  branches: Branch[],
  startDate: string,
  endDate: string,
): Promise<BranchPerformance[]> {
  return Promise.all(
    branches.map(async (branch) => {
      const first = await ordersApi.list({ branchId: branch.id, startDate, endDate, page: 1 });
      const rest =
        first.totalPages > 1
          ? await Promise.all(
              Array.from({ length: first.totalPages - 1 }, (_, index) =>
                ordersApi.list({ branchId: branch.id, startDate, endDate, page: index + 2 }),
              ),
            )
          : [];
      const allOrders = [first, ...rest].flatMap((page) => page.items);
      const revenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      return {
        branchId: branch.id,
        branchName: branch.name,
        orderCount: first.totalCount,
        revenue,
        averageBasket: first.totalCount ? revenue / first.totalCount : 0,
      };
    }),
  );
}

function DashboardScreen() {
  const { t, locale, dir } = useI18n();
  const { user } = useAuth();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  const end = filters.to ?? toDateInput(new Date());
  const startDefault = new Date();
  startDefault.setDate(startDefault.getDate() - 29);
  const start = filters.from ?? toDateInput(startDefault);
  const startIso = startOfDayIso(start);
  const endIso = endOfDayIso(end);
  const isAdmin = user?.roleId === 1;
  const branchId = isAdmin ? filters.branch : (user?.branchId ?? undefined);
  const setFilters = (patch: Partial<DashboardSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });
  const branches = useQuery(branchesQuery());
  const apiQuery = {
    startDate: startIso,
    endDate: endIso,
    branchId,
    roleId: user?.roleId ?? undefined,
  };
  const revenue = useQuery({
    queryKey: ["dashboard", "revenue", apiQuery],
    queryFn: () => dashboardApi.revenue(apiQuery),
  });
  const topProducts = useQuery({
    queryKey: ["dashboard", "top-products", apiQuery],
    queryFn: () => dashboardApi.topProducts(apiQuery),
  });
  const expenses = useQuery({
    queryKey: ["dashboard", "expenses", startIso, endIso],
    queryFn: () => dashboardApi.expenses({ startDate: startIso, endDate: endIso }),
  });
  const stock = useQuery({
    queryKey: ["dashboard", "stock", apiQuery],
    queryFn: () => dashboardApi.stock(apiQuery),
  });
  const performanceBranches = isAdmin
    ? branchId
      ? (branches.data ?? []).filter((branch) => branch.id === branchId)
      : (branches.data ?? [])
    : (branches.data ?? []).filter((branch) => branch.id === user?.branchId);
  const performance = useQuery({
    queryKey: [
      "dashboard",
      "branch-performance",
      performanceBranches.map((branch) => branch.id),
      startIso,
      endIso,
    ],
    queryFn: () => loadBranchPerformance(performanceBranches, startIso, endIso),
    enabled: branches.isSuccess,
  });
  const pending =
    revenue.isPending ||
    topProducts.isPending ||
    expenses.isPending ||
    stock.isPending ||
    performance.isPending;
  const firstError =
    revenue.error ?? topProducts.error ?? expenses.error ?? stock.error ?? performance.error;
  if (pending) return <LoadingState />;
  if (firstError)
    return (
      <ErrorState
        error={firstError}
        onRetry={() => {
          void revenue.refetch();
          void topProducts.refetch();
          void expenses.refetch();
          void stock.refetch();
          void performance.refetch();
        }}
      />
    );
  const points = revenue.data?.totalRevenue ?? [];
  const periodSales = points.reduce((sum, point) => sum + point.subtotal, 0);
  const today = toDateInput(new Date());
  const todaySales = points
    .filter((point) => toDateInput(new Date(point.date)) === today)
    .reduce((sum, point) => sum + point.subtotal, 0);
  const branchRows = performance.data ?? [];
  const orderCount = branchRows.reduce((sum, branch) => sum + branch.orderCount, 0);
  const orderRevenue = branchRows.reduce((sum, branch) => sum + branch.revenue, 0);
  const avgBasket = orderCount ? orderRevenue / orderCount : 0;
  const outstanding =
    (expenses.data?.remainingByCurrency ?? [])
      .map((entry) => formatMoney(entry.amount, locale, entry.currencySymbol ?? entry.currencyCode))
      .join(" · ") || formatMoney(0, locale);
  const chartPoints = points.map((point) => ({
    date: new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(point.date)),
    value: point.subtotal,
  }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={start}
            onChange={(event) => setFilters({ from: event.target.value || undefined })}
            aria-label={t("common.from")}
            className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
          />
          <input
            type="date"
            value={end}
            onChange={(event) => setFilters({ to: event.target.value || undefined })}
            aria-label={t("common.to")}
            className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
          />
          {isAdmin && (
            <select
              value={branchId ?? ""}
              onChange={(event) =>
                setFilters({ branch: event.target.value ? Number(event.target.value) : undefined })
              }
              className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("common.allBranches")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          icon={CircleDollarSign}
          label={t("dashboard.todaySales")}
          value={formatMoney(todaySales, locale)}
        />
        <Kpi
          icon={CircleDollarSign}
          label={t("dashboard.periodSales")}
          value={formatMoney(periodSales, locale)}
        />
        <Kpi
          icon={ReceiptText}
          label={t("dashboard.orders")}
          value={formatNumber(orderCount, locale)}
        />
        <Kpi
          icon={ShoppingBasket}
          label={t("dashboard.averageBasket")}
          value={formatMoney(avgBasket, locale)}
        />
        <Kpi icon={AlertTriangle} label={t("dashboard.outstanding")} value={outstanding} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader title={t("dashboard.salesOverTime")} description={`${start} — ${end}`} />
          <div className="h-72 p-4">
            {chartPoints.length === 0 ? (
              <EmptyState title={t("dashboard.noSales")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints}>
                  <defs>
                    <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border)"
                  />
                  <XAxis dataKey="date" reversed={dir === "rtl"} tick={{ fontSize: 11 }} />
                  <YAxis orientation={dir === "rtl" ? "right" : "left"} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatMoney(Number(value), locale)} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-primary)"
                    fill="url(#sales-fill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title={t("dashboard.topProducts")} />
          <div className="h-72 p-4">
            {(topProducts.data?.topProducts ?? []).length === 0 ? (
              <EmptyState title={t("dashboard.noProducts")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts.data?.topProducts ?? []}
                  layout="vertical"
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="var(--color-border)"
                  />
                  <XAxis type="number" reversed={dir === "rtl"} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    orientation={dir === "rtl" ? "right" : "left"}
                    width={90}
                    reversed={dir === "rtl"}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => formatNumber(Number(value), locale)} />
                  <Bar dataKey="quantitySold" fill="var(--color-primary)" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader title={t("dashboard.branchComparison")} />
          <TableShell>
            <thead>
              <tr>
                <Th>{t("common.branch")}</Th>
                <Th align="end">{t("dashboard.orders")}</Th>
                <Th align="end">{t("dashboard.orderRevenue")}</Th>
                <Th align="end">{t("dashboard.averageBasket")}</Th>
              </tr>
            </thead>
            <tbody>
              {branchRows.map((branch) => (
                <tr key={branch.branchId}>
                  <Td className="font-medium">{branch.branchName}</Td>
                  <Td align="end">{formatNumber(branch.orderCount, locale)}</Td>
                  <Td align="end" className="font-numeric">
                    {formatMoney(branch.revenue, locale)}
                  </Td>
                  <Td align="end" className="font-numeric">
                    {formatMoney(branch.averageBasket, locale)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
        <Card>
          <CardHeader title={t("dashboard.stockHealth")} />
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1">
            <MiniStat
              icon={AlertTriangle}
              label={t("dashboard.lowStock")}
              value={stock.data?.lowStockVariants.length ?? 0}
              tone="warning"
            />
            <MiniStat
              icon={Boxes}
              label={t("dashboard.outOfStock")}
              value={stock.data?.outOfStockVariants.length ?? 0}
              tone="error"
            />
            <MiniStat
              icon={ReceiptText}
              label={t("dashboard.expenseDrafts")}
              value={expenses.data?.draftedCount ?? 0}
              tone="neutral"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <span className="mb-3 grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-4" />
      </span>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-numeric text-xl font-semibold" title={value}>
        {value}
      </p>
    </Card>
  );
}
function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  tone: "warning" | "error" | "neutral";
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <span
        className={`grid size-9 place-items-center rounded-lg ${tone === "warning" ? "bg-warning-soft text-warning" : tone === "error" ? "bg-error-soft text-destructive" : "bg-muted text-muted-foreground"}`}
      >
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-numeric text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
