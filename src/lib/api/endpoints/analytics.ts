import { api } from "../client";
import type {
  DashboardExpenseSummary,
  DashboardRevenuePoint,
  DashboardStockSummary,
  DashboardTopProduct,
} from "../types";
import { downloadFile, type QueryValue } from "./shared";

type DashboardQuery = {
  startDate?: string | undefined;
  endDate?: string | undefined;
  branchId?: number | undefined;
  roleId?: number | undefined;
};

export const dashboardApi = {
  revenue: (query: DashboardQuery) =>
    api<{ totalRevenue: DashboardRevenuePoint[] }>("dashboard/total-revenue-summary", { query }),
  topProducts: (query: DashboardQuery) =>
    api<{ topProducts: DashboardTopProduct[] }>("dashboard/top-products", { query }),
  expenses: (query: Pick<DashboardQuery, "startDate" | "endDate">) =>
    api<DashboardExpenseSummary>("dashboard/expenses-summary", { query }),
  stock: (query: DashboardQuery) =>
    api<DashboardStockSummary>("dashboard/stock-summary", { query }),
};

export const reportsApi = {
  download: (report: string, query: Record<string, QueryValue> = {}) =>
    downloadFile(`reports/${report}`, query),
};
