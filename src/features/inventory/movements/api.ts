import type { StockMovementRow } from "@/features/inventory/movements/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

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
};
