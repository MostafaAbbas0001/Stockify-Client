import type { Brand } from "@/features/catalog/brands/types";
import { api } from "@/shared/api/client";

export const brandsApi = {
  list: () => api<Brand[]>("brands"),
  create: (body: { name: string }) => api<Brand>("brands", { method: "POST", body }),
  update: (id: number, body: { name: string }) =>
    api<Brand>(`brands/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`brands/${id}`, { method: "DELETE" }),
};
