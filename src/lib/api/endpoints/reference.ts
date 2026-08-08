import { api } from "../client";
import type { Branch, Currency, DeliveryCharge, Lookup, TaxRate } from "../types";

export const referenceApi = {
  branches: () => api<Branch[]>("branches"),
  currencies: () => api<Currency[]>("currencies"),
  taxRates: () => api<TaxRate[]>("tax-rates"),
  deliveryCharges: () => api<DeliveryCharge[]>("delivery-charges"),
  orderStatuses: () => api<Lookup[]>("orders/statuses"),
  invoiceStatuses: () => api<Lookup[]>("invoices/statuses"),
  roles: () => api<Lookup[]>("users/roles"),
};

export const branchesApi = {
  list: referenceApi.branches,
  create: (body: { name: string }) => api<boolean>("branches", { method: "POST", body }),
  update: (id: number, body: { name: string }) =>
    api<Branch>(`branches/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`branches/${id}`, { method: "DELETE" }),
};

export const deliveryChargesApi = {
  list: referenceApi.deliveryCharges,
  create: (body: { locationName: string; fee: number }) =>
    api<DeliveryCharge>("delivery-charges", { method: "POST", body }),
  update: (id: number, body: { locationName: string; fee: number }) =>
    api<DeliveryCharge>(`delivery-charges/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`delivery-charges/${id}`, { method: "DELETE" }),
};
