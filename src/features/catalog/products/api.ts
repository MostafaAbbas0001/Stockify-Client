import type {
  ProductDetail,
  ProductRequest,
  ProductSummary,
  ProductVariantRow,
  VariantCreateRequest,
  VariantPatchRequest,
  VariantRow,
} from "@/features/catalog/products/types";
import type { VariantLocationStock } from "@/features/inventory/stock/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

export const productsApi = {
  list: async (query: {
    search?: string | undefined;
    brandId?: number | undefined;
    categoryId?: number | undefined;
    page?: number | undefined;
  }) => unwrapPaged<ProductSummary>(await api<unknown>("products", { query }), "products"),
  get: (id: number) => api<ProductDetail>(`products/${id}`),
  create: (body: ProductRequest) => api<ProductDetail>("products", { method: "POST", body }),
  update: (id: number, body: ProductRequest) =>
    api<ProductDetail>(`products/${id}`, { method: "PUT", body }),
  setAttributes: (id: number, body: number[]) =>
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

export const variantsApi = {
  list: (query: {
    search?: string | undefined;
    productId?: number | undefined;
    brandId?: number | undefined;
    categoryId?: number | undefined;
    isSellable?: boolean | undefined;
    page?: number | undefined;
  }) =>
    api<unknown>("product-variants", { query }).then((data) =>
      unwrapPaged<VariantRow>(data, "variants"),
    ),
};
