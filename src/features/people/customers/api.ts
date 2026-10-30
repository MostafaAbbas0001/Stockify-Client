import type { Customer } from "@/features/people/customers/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

export const customersApi = {
  list: (query: { search?: string | undefined; page?: number | undefined }) =>
    api<unknown>("customers", { query }).then((data) => unwrapPaged<Customer>(data, "customers")),
  get: (id: number) => api<Customer>(`customers/${id}`),
  create: (body: { name: string; phone: string; address: string; email: string }) =>
    api<Customer>("customers", { method: "POST", body }),
  update: (id: number, body: { name: string; phone: string; address: string; email: string }) =>
    api<Customer>(`customers/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`customers/${id}`, { method: "DELETE" }),
};
