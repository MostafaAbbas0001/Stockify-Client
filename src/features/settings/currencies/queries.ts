import { queryOptions } from "@tanstack/react-query";

import { currenciesApi } from "@/features/settings/currencies/api";

export const currenciesQuery = () =>
  queryOptions({
    queryKey: ["currencies"] as const,
    queryFn: currenciesApi.list,
    staleTime: 5 * 60_000,
  });
