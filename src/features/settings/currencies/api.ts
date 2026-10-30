import type { Currency } from "@/features/settings/currencies/types";
import { api } from "@/shared/api/client";

export const currenciesApi = {
  list: () => api<Currency[]>("currencies"),
};
