import { queryOptions } from "@tanstack/react-query";

import { attributesApi } from "@/features/catalog/attributes/api";

export const attributeKeys = { all: ["attributes"] as const };

export const attributesQuery = () =>
  queryOptions({ queryKey: attributeKeys.all, queryFn: attributesApi.list, staleTime: 5 * 60_000 });
