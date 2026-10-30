import type {
  AdjustmentRequest,
  AdjustmentRow,
  InventoryLotDetail,
  InventoryLotRow,
  LotCreateRequest,
} from "@/features/inventory/stock/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

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
