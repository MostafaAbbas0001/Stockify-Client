import { queryOptions } from "@tanstack/react-query";

import { branchesApi } from "@/features/settings/branches/api";

export const branchKeys = { all: ["branches"] as const };

export const branchesQuery = () =>
  queryOptions({ queryKey: branchKeys.all, queryFn: branchesApi.list, staleTime: 5 * 60_000 });
