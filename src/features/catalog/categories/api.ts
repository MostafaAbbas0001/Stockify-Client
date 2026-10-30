import type { Category } from "@/features/catalog/categories/types";
import { api } from "@/shared/api/client";

export const categoriesApi = {
  list: () => api<Category[]>("categories"),
  create: (body: { name: string }) => api<Category>("categories", { method: "POST", body }),
  update: (id: number, body: { name: string }) =>
    api<Category>(`categories/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`categories/${id}`, { method: "DELETE" }),
};
