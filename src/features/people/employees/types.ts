export type EmployeeRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  isSale: boolean;
  branchId: number;
  branchName?: string;
  createdAt?: string;
};

export type BranchEmployee = {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  isSale: boolean;
  branchId: number;
};
