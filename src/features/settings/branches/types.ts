export type Branch = {
  id: number;
  name: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
};
