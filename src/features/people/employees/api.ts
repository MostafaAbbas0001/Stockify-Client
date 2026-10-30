import type { BranchEmployee, EmployeeRow } from "@/features/people/employees/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

export const employeesApi = {
  list: (query: {
    search?: string | undefined;
    branchId?: number | undefined;
    isSale?: boolean | undefined;
    page?: number | undefined;
  }) =>
    api<unknown>("employees", { query }).then((data) =>
      unwrapPaged<EmployeeRow>(data, "employees"),
    ),
  get: (id: number) => api<EmployeeRow>(`employees/${id}`),
  currentBranch: () => api<BranchEmployee[]>("employees/current-branch"),
  salesSummary: (employeeId: number, startDate: string, endDate: string) =>
    api<{ employeeId: number; startDate: string; endDate: string; totalSales: number }>(
      `employees/${employeeId}/sales-summary`,
      { query: { startDate, endDate } },
    ),
  create: (body: {
    name: string;
    branchId: number;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    isSale?: boolean | undefined;
  }) => api<EmployeeRow>("employees", { method: "POST", body }),
  update: (
    id: number,
    body: {
      name?: string | undefined;
      branchId?: number | undefined;
      email?: string | undefined;
      phone?: string | undefined;
      address?: string | undefined;
      isSale?: boolean | undefined;
    },
  ) => api<EmployeeRow>(`employees/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`employees/${id}`, { method: "DELETE" }),
};
