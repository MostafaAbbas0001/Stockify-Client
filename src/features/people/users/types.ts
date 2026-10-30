export type Role = { id: number; name: string };

export type UserPermissionsResponse = {
  userId: number;
  roleId: number;
  roleName: string;
  permissions: {
    id: number;
    key: string;
    target: string;
    roleDefault: boolean;
    userOverride: boolean | null;
    effective: boolean;
  }[];
};

export type UserRow = {
  id: number;
  email: string;
  username: string;
  /** The company owner cannot be deleted or have their role changed. */
  isOwner?: boolean;
  role: string;
  roleId: number;
  branch: string;
  branchId: number;
  createdAt: string;
};

export type UserRequest = {
  email: string;
  username: string;
  password?: string | null;
  roleId: number;
  branchId: number;
};
