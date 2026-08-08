import { api } from "../client";
import type { PosItem, VariantRow } from "../types";
import { unwrapPaged } from "./shared";

export const posApi = {
  lookup: (code: string) => api<PosItem>("pos/items", { query: { code } }),
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
