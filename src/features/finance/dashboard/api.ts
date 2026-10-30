import type {
  DashboardExpenseSummary,
  DashboardRevenuePoint,
  DashboardStockSummary,
  DashboardTopProduct,
} from "@/features/finance/dashboard/types";
import { api } from "@/shared/api/client";

type DashboardQuery = {
  startDate?: string | undefined;
  endDate?: string | undefined;
  branchId?: number | undefined;
};

export const dashboardApi = {
  revenue: (query: DashboardQuery) =>
    api<{ totalRevenue: DashboardRevenuePoint[] }>("dashboard/total-revenue-summary", { query }),
  topProducts: (query: DashboardQuery) =>
    api<{ topProducts: DashboardTopProduct[] }>("dashboard/top-products", { query }),
  expenses: (query: DashboardQuery) =>
    api<DashboardExpenseSummary>("dashboard/expenses-summary", { query }),
  stock: (query: DashboardQuery) =>
    api<DashboardStockSummary>("dashboard/stock-summary", { query }),
};
