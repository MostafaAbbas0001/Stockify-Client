import { queryOptions } from "@tanstack/react-query";

import { usersApi } from "@/features/people/users/api";

export const rolesQuery = () =>
  queryOptions({ queryKey: ["roles"] as const, queryFn: usersApi.roles, staleTime: 5 * 60_000 });
