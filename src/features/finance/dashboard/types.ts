export type DashboardRevenuePoint = { date: string; subtotal: number };

export type DashboardTopProduct = { productName: string; quantitySold: number };

export type DashboardExpenseSummary = {
  draftedCount: number;
  partiallyPaidCount: number;
  fullyPaidCount: number;
  remainingByCurrency: {
    currencyId: number | null;
    currencyCode: string | null;
    currencySymbol: string | null;
    amount: number;
  }[];
};

export type DashboardStockSummary = {
  lowStockVariants: {
    variantId: number;
    sku: string;
    productName: string;
    branchId: number;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
  }[];
  outOfStockVariants: {
    variantId: number;
    sku: string;
    productName: string;
    branchId: number;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
  }[];
  transferInTransit: unknown[];
  latestTransfers: unknown[];
};

export type BranchPerformance = {
  branchId: number;
  branchName: string;
  orderCount: number;
  revenue: number;
  averageBasket: number;
};
