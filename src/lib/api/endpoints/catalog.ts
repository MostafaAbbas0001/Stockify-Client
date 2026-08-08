import { api } from "../client";
import type {
  AttributeValue,
  Brand,
  Category,
  ProductAttribute,
  ProductDetail,
  ProductRequest,
  ProductSummary,
  ProductVariantRow,
  VariantCreateRequest,
  VariantLocationStock,
  VariantPatchRequest,
} from "../types";
import { unwrapPaged } from "./shared";

export const brandsApi = {
  list: () => api<Brand[]>("brands"),
  create: (body: { name: string }) => api<Brand>("brands", { method: "POST", body }),
  update: (id: number, body: { name: string }) =>
    api<Brand>(`brands/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`brands/${id}`, { method: "DELETE" }),
};

export const categoriesApi = {
  list: () => api<Category[]>("categories"),
  create: (body: { name: string }) => api<Category>("categories", { method: "POST", body }),
  update: (id: number, body: { name: string }) =>
    api<Category>(`categories/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`categories/${id}`, { method: "DELETE" }),
};

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

export const productsApi = {
  list: async (query: {
    search?: string | undefined;
    brandId?: number | undefined;
    categoryId?: number | undefined;
    requiresLotTracking?: boolean | undefined;
    requiresExpiryDate?: boolean | undefined;
    page?: number | undefined;
  }) => unwrapPaged<ProductSummary>(await api<unknown>("products", { query }), "products"),
  get: (id: number) => api<ProductDetail>(`products/${id}`),
  create: (body: ProductRequest) => api<ProductDetail>("products", { method: "POST", body }),
  update: (id: number, body: ProductRequest) =>
    api<ProductDetail>(`products/${id}`, { method: "PUT", body }),
  setAttributes: (id: number, body: { attributeId: number; isRequired: boolean }[]) =>
    api<ProductDetail>(`products/${id}/attributes`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`products/${id}`, { method: "DELETE" }),
  variants: async (
    productId: number,
    query: { search?: string | undefined; page?: number | undefined },
  ) =>
    unwrapPaged<ProductVariantRow>(
      await api<unknown>(`products/${productId}/variants`, { query }),
      "variants",
    ),
};

export const productVariantsApi = {
  list: async (query: {
    search?: string | undefined;
    productId?: number | undefined;
    brandId?: number | undefined;
    categoryId?: number | undefined;
    isSellable?: boolean | undefined;
    page?: number | undefined;
  }) =>
    unwrapPaged<ProductVariantRow>(await api<unknown>("product-variants", { query }), "variants"),
  create: (body: VariantCreateRequest) =>
    api<ProductVariantRow>("product-variants", { method: "POST", body }),
  patch: (id: number, body: VariantPatchRequest) =>
    api<ProductVariantRow>(`product-variants/${id}`, { method: "PATCH", body }),
  remove: (id: number) => api<void>(`product-variants/${id}`, { method: "DELETE" }),
  locationStock: (id: number) => api<VariantLocationStock>(`product-variants/${id}/location-stock`),
};
