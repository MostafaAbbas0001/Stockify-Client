import { api } from "../client";
import type {
  BranchEmployee,
  Customer,
  EmployeeRow,
  UserPermissionsResponse,
  UserRequest,
  UserRow,
} from "../types";
import { unwrapPaged } from "./shared";

export const customersApi = {
  list: (query: { search?: string | undefined; page?: number | undefined }) =>
    api<unknown>("customers", { query }).then((data) => unwrapPaged<Customer>(data, "customers")),
  get: (id: number) => api<Customer>(`customers/${id}`),
  create: (body: { name: string; phone: string; address: string; email: string }) =>
    api<Customer>("customers", { method: "POST", body }),
  update: (id: number, body: { name: string; phone: string; address: string; email: string }) =>
    api<Customer>(`customers/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`customers/${id}`, { method: "DELETE" }),
};

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

export const usersApi = {
  list: (query: {
    search?: string | undefined;
    roleId?: number | undefined;
    branchId?: number | undefined;
    page?: number | undefined;
  }) => api<unknown>("users", { query }).then((data) => unwrapPaged<UserRow>(data, "users")),
  get: (userId: number) => api<UserRow>(`users/${userId}`),
  create: (body: UserRequest & { password: string }) =>
    api<UserRow>("users", { method: "POST", body }),
  update: (userId: number, body: UserRequest) =>
    api<UserRow>(`users/${userId}`, { method: "PUT", body }),
  remove: (userId: number) => api<void>(`users/${userId}`, { method: "DELETE" }),
  permissions: (userId: number) => api<UserPermissionsResponse>(`users/${userId}/permissions`),
  updatePermissions: (userId: number, items: { permissionId: number; isActive: boolean }[]) =>
    api<void>(`users/${userId}/permissions`, { method: "PUT", body: { items } }),
};
