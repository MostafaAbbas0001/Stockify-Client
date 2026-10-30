import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  PackageX,
  ReceiptText,
  ShoppingBasket,
} from "lucide-react";
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

import { AppSelect } from "@/shared/components/AppSelect";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import {
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  StatStrip,
  TableShell,
  Td,
  Th,
} from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { dashboardApi } from "@/features/finance/dashboard/api";
import { ordersApi } from "@/features/sales/orders/api";
import type { BranchPerformance } from "@/features/finance/dashboard/types";
import type { Branch } from "@/features/settings/branches/types";
import {
  endOfDayIso,
  formatMoney,
  formatNumber,
  startOfDayIso,
  toDateInput,
} from "@/shared/lib/format";
import type { DashboardSearch } from "@/features/finance/dashboard/search";
import { Input } from "@/shared/ui/input";

const routeApi = getRouteApi("/_app/dashboard/");

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

export function DashboardScreen() {
  const { t, locale, dir } = useI18n();
  const { user, can } = useAuth();
  const filters = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const end = filters.to ?? toDateInput(new Date());
  const startDefault = new Date();
  startDefault.setDate(startDefault.getDate() - 29);
  const start = filters.from ?? toDateInput(startDefault);
  const startIso = startOfDayIso(start);
  const endIso = endOfDayIso(end);
  // Users with branch.all.access can switch branches; the API scopes everyone else
  // to the branch in their token regardless of what is sent.
  const isAdmin = can(PERM.branchAllAccess);
  const branchId = isAdmin ? filters.branch : (user?.branchId ?? undefined);
  const setFilters = (patch: Partial<DashboardSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });
  const branches = useQuery(branchesQuery());
  const apiQuery = {
    startDate: startIso,
    endDate: endIso,
    branchId,
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
    queryKey: ["dashboard", "expenses", apiQuery],
    queryFn: () => dashboardApi.expenses(apiQuery),
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
  if (pending)
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  if (firstError)
    return (
      <Card>
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
      </Card>
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
      .join(", ") || formatMoney(0, locale);
  const chartPoints = points.map((point) => ({
    date: new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(point.date)),
    value: point.subtotal,
  }));
  const axisTick = { fontSize: 12, fill: "var(--color-muted-foreground)" };
  const tooltipStyle = {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 18,
    color: "var(--color-popover-foreground)",
    fontSize: 13,
    padding: "8px 12px",
    boxShadow: "0 12px 32px -8px rgb(0 0 0 / 0.18)",
  };
  // Fields on the canvas take the paper fill so they stay visible against #f5f5f5.
  const onCanvas = "border-border bg-card";

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.subtitle")}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Input
              type="date"
              value={start}
              onChange={(event) => setFilters({ from: event.target.value || undefined })}
              aria-label={t("common.from")}
              className={`${onCanvas} sm:w-40`}
            />
            <Input
              type="date"
              value={end}
              onChange={(event) => setFilters({ to: event.target.value || undefined })}
              aria-label={t("common.to")}
              className={`${onCanvas} sm:w-40`}
            />
            {isAdmin && (
              <AppSelect
                value={branchId ?? ""}
                onChange={(event) =>
                  setFilters({
                    branch: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                aria-label={t("common.branch")}
                className={`${onCanvas} col-span-2 hover:bg-card sm:w-48`}
              >
                <option value="">{t("common.allBranches")}</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </AppSelect>
            )}
          </div>
        }
      />

      <StatStrip className="lg:grid-cols-5">
        <StatCard
          icon={CircleDollarSign}
          label={t("dashboard.todaySales")}
          value={formatMoney(todaySales, locale)}
        />
        <StatCard
          icon={CircleDollarSign}
          label={t("dashboard.periodSales")}
          value={formatMoney(periodSales, locale)}
        />
        <StatCard
          icon={ReceiptText}
          label={t("dashboard.orders")}
          value={formatNumber(orderCount, locale)}
        />
        <StatCard
          icon={ShoppingBasket}
          label={t("dashboard.averageBasket")}
          value={formatMoney(avgBasket, locale)}
        />
        <StatCard
          icon={AlertTriangle}
          label={t("dashboard.outstanding")}
          value={outstanding}
          className="col-span-2 lg:col-span-1"
        />
      </StatStrip>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader title={t("dashboard.salesOverTime")} description={`${start} – ${end}`} />
          <div dir="ltr" className="h-64 p-4 sm:h-72">
            {chartPoints.length === 0 ? (
              <EmptyState title={t("dashboard.noSales")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    reversed={dir === "rtl"}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    orientation={dir === "rtl" ? "right" : "left"}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value), locale)}
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-brand)"
                    strokeWidth={1.75}
                    fill="var(--color-brand)"
                    fillOpacity={0.1}
                    activeDot={{ r: 4, fill: "var(--color-brand)", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title={t("dashboard.topProducts")} />
          <div dir="ltr" className="h-64 p-4 sm:h-72">
            {(topProducts.data?.topProducts ?? []).length === 0 ? (
              <EmptyState title={t("dashboard.noProducts")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts.data?.topProducts ?? []}
                  layout="vertical"
                  margin={{ left: 0, right: 8 }}
                  barSize={14}
                >
                  <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                  <XAxis
                    type="number"
                    reversed={dir === "rtl"}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    orientation={dir === "rtl" ? "right" : "left"}
                    width={96}
                    reversed={dir === "rtl"}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatNumber(Number(value), locale)}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--color-muted)" }}
                  />
                  <Bar dataKey="quantitySold" fill="var(--color-brand)" radius={7} />
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
                <Th align="end" width="xs">
                  {t("dashboard.orders")}
                </Th>
                <Th align="end" width="sm">
                  {t("dashboard.orderRevenue")}
                </Th>
                <Th align="end" width="sm">
                  {t("dashboard.averageBasket")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {branchRows.map((branch) => (
                <tr key={branch.branchId}>
                  <Td className="font-medium">{branch.branchName}</Td>
                  <Td align="end" className="tabular-nums">
                    {formatNumber(branch.orderCount, locale)}
                  </Td>
                  <Td align="end" className="tabular-nums">
                    {formatMoney(branch.revenue, locale)}
                  </Td>
                  <Td align="end" className="tabular-nums">
                    {formatMoney(branch.averageBasket, locale)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
        <Card>
          <CardHeader title={t("dashboard.stockHealth")} />
          <dl className="divide-y divide-border px-4">
            <HealthRow
              icon={AlertTriangle}
              label={t("dashboard.lowStock")}
              value={stock.data?.lowStockVariants.length ?? 0}
            />
            <HealthRow
              icon={PackageX}
              label={t("dashboard.outOfStock")}
              value={stock.data?.outOfStockVariants.length ?? 0}
            />
            <HealthRow
              icon={ReceiptText}
              label={t("dashboard.expenseDrafts")}
              value={expenses.data?.draftedCount ?? 0}
            />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function HealthRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="text-heading-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
