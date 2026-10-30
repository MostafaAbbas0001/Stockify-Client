import { queryOptions } from "@tanstack/react-query";

import { categoriesApi } from "@/features/catalog/categories/api";

export const categoryKeys = { all: ["categories"] as const };

export const categoriesQuery = () =>
  queryOptions({ queryKey: categoryKeys.all, queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
