import { api } from "../client";
import type { SaleRequest, SaleRow } from "../types";
import { unwrapPaged } from "./shared";

export const salesApi = {
  list: (query: {
    search?: string | undefined;
    type?: number | undefined;
    isActive?: boolean | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
  }) => api<unknown>("sales", { query }).then((data) => unwrapPaged<SaleRow>(data, "sales")),
  create: (body: SaleRequest) => api<SaleRow>("sales", { method: "POST", body }),
  update: (id: number, body: SaleRequest) => api<SaleRow>(`sales/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`sales/${id}`, { method: "DELETE" }),
};
