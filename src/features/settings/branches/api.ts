import type { Branch } from "@/features/settings/branches/types";
import { api } from "@/shared/api/client";

export const branchesApi = {
  list: () => api<Branch[]>("branches"),
  create: (body: { name: string }) => api<boolean>("branches", { method: "POST", body }),
  update: (id: number, body: { name: string }) =>
    api<Branch>(`branches/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`branches/${id}`, { method: "DELETE" }),
};
