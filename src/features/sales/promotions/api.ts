import type { SaleRequest, SaleRow } from "@/features/sales/promotions/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

export const salesApi = {
  list: (query: {
    search?: string | undefined;
    saleTypeId?: number | undefined;
    isActive?: boolean | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
  }) => api<unknown>("sales", { query }).then((data) => unwrapPaged<SaleRow>(data, "sales")),
  create: (body: SaleRequest) => api<SaleRow>("sales", { method: "POST", body }),
  update: (id: number, body: SaleRequest) => api<SaleRow>(`sales/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`sales/${id}`, { method: "DELETE" }),
};
