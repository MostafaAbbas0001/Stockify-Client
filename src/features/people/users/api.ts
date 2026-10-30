import type {
  Role,
  UserPermissionsResponse,
  UserRequest,
  UserRow,
} from "@/features/people/users/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

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
  roles: () => api<Role[]>("users/roles"),
  permissions: (userId: number) => api<UserPermissionsResponse>(`users/${userId}/permissions`),
  updatePermissions: (userId: number, items: { permissionId: number; isActive: boolean }[]) =>
    api<void>(`users/${userId}/permissions`, { method: "PUT", body: { items } }),
};
