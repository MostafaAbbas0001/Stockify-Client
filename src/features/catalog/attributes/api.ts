import type { AttributeValue, ProductAttribute } from "@/features/catalog/attributes/types";
import { api } from "@/shared/api/client";

export const attributesApi = {
  list: () => api<ProductAttribute[]>("attributes"),
  get: (id: number) => api<ProductAttribute>(`attributes/${id}`),
  create: (body: { name: string; values: string[] }) =>
    api<ProductAttribute>("attributes", { method: "POST", body }),
  update: (id: number, body: { name: string }) =>
    api<ProductAttribute>(`attributes/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`attributes/${id}`, { method: "DELETE" }),
  addValue: (attributeId: number, body: { value: string }) =>
    api<AttributeValue>(`attributes/${attributeId}/values`, { method: "POST", body }),
  updateValue: (attributeId: number, valueId: number, body: { value: string }) =>
    api<AttributeValue>(`attributes/${attributeId}/values/${valueId}`, { method: "PUT", body }),
  removeValue: (attributeId: number, valueId: number) =>
    api<void>(`attributes/${attributeId}/values/${valueId}`, { method: "DELETE" }),
};
