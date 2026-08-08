import { api } from "../client";
import type {
  AdjustmentRequest,
  AdjustmentRow,
  InventoryLotDetail,
  InventoryLotRow,
  Lookup,
  LotCreateRequest,
  StockMovementRow,
  TransferCreateRequest,
  TransferDispatchRequest,
  TransferReceiptRequest,
  TransferRow,
  TransferStatistics,
} from "../types";
import { unwrapPaged } from "./shared";

export const inventoryLotsApi = {
  list: async (query: {
    search?: string | undefined;
    productId?: number | undefined;
    variantId?: number | undefined;
    branchId?: number | undefined;
    includeEmpty?: boolean | undefined;
    includeExpired?: boolean | undefined;
    page?: number | undefined;
  }) => unwrapPaged<InventoryLotRow>(await api<unknown>("inventory-lots", { query }), "lots"),
  get: (id: number) => api<InventoryLotDetail>(`inventory-lots/${id}`),
  create: (body: LotCreateRequest) =>
    api<InventoryLotDetail>("inventory-lots", { method: "POST", body }),
};

export const adjustmentsApi = {
  list: async (query: {
    search?: string | undefined;
    branchId?: number | undefined;
    variantId?: number | undefined;
    inventoryLotId?: number | undefined;
    minimumQuantity?: number | undefined;
    maximumQuantity?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
  }) =>
    unwrapPaged<AdjustmentRow>(
      await api<unknown>("inventory-adjustments", { query }),
      "adjustments",
    ),
  get: (id: number) => api<AdjustmentRow>(`inventory-adjustments/${id}`),
  create: (body: AdjustmentRequest) =>
    api<AdjustmentRow>("inventory-adjustments", { method: "POST", body }),
  update: (id: number, body: AdjustmentRequest) =>
    api<AdjustmentRow>(`inventory-adjustments/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`inventory-adjustments/${id}`, { method: "DELETE" }),
  setReorderLevel: (body: { variantId: number; branchId: number; reorderLevel: number }) =>
    api<void>("inventory-adjustments/reorder-level", { method: "PUT", body }),
};

export const stockMovementsApi = {
  list: async (query: {
    search?: string | undefined;
    movementTypeId?: number | undefined;
    branchId?: number | undefined;
    variantId?: number | undefined;
    inventoryLotId?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
  }) =>
    unwrapPaged<StockMovementRow>(await api<unknown>("stock-movements", { query }), "movements"),
  types: () => api<Lookup[]>("stock-movements/types"),
};

export const stockTransfersApi = {
  list: async (query: {
    search?: string | undefined;
    branchId?: number | undefined;
    sourceBranchId?: number | undefined;
    destinationBranchId?: number | undefined;
    statusId?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
  }) => unwrapPaged<TransferRow>(await api<unknown>("stock-transfers", { query }), "transfers"),
  get: (id: number) => api<TransferRow>(`stock-transfers/${id}`),
  statistics: (query: { branchId?: number | undefined }) =>
    api<TransferStatistics>("stock-transfers/statistics", { query }),
  create: (body: TransferCreateRequest) =>
    api<TransferRow>("stock-transfers", { method: "POST", body }),
  dispatch: (id: number, body: TransferDispatchRequest) =>
    api<unknown>(`stock-transfers/${id}/dispatches`, { method: "POST", body }),
  receive: (id: number, body: TransferReceiptRequest) =>
    api<unknown>(`stock-transfers/${id}/receipts`, { method: "POST", body }),
  cancel: (id: number, reason?: string) =>
    api<void>(`stock-transfers/${id}`, {
      method: "DELETE",
      query: { reason: reason || undefined },
    }),
  resolveDiscrepancy: (id: number, note: string) =>
    api<TransferRow>(`stock-transfers/${id}/discrepancy`, { method: "PUT", body: { note } }),
};
