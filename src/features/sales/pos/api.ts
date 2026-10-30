import type { PosItem } from "@/features/sales/pos/types";
import { api } from "@/shared/api/client";

export const posApi = {
  lookup: (code: string) => api<PosItem>("pos/items", { query: { code } }),
};
