import { queryOptions } from "@tanstack/react-query";

import { brandsApi } from "@/features/catalog/brands/api";

export const brandKeys = { all: ["brands"] as const };

export const brandsQuery = () =>
  queryOptions({ queryKey: brandKeys.all, queryFn: brandsApi.list, staleTime: 5 * 60_000 });
