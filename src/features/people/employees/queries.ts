import { queryOptions } from "@tanstack/react-query";

import { employeesApi } from "@/features/people/employees/api";

export const employeeKeys = {
  all: ["employees"] as const,
  currentBranch: ["employees", "current-branch"] as const,
};

/** Sales staff for the signed-in user's branch (from the JWT branch claim). */
export const branchEmployeesQuery = () =>
  queryOptions({
    queryKey: employeeKeys.currentBranch,
    queryFn: employeesApi.currentBranch,
    staleTime: 60_000,
  });
