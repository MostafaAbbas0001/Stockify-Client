import type { Lookups } from "@/features/lookups/types";
import { api } from "@/shared/api/client";

export const lookupsApi = {
  all: () => api<Lookups>("lookups"),
};
