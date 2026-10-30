import { queryOptions } from "@tanstack/react-query";

import { deliveryChargesApi } from "@/features/settings/delivery-locations/api";

export const deliveryChargeKeys = { all: ["delivery-charges"] as const };

export const deliveryChargesQuery = () =>
  queryOptions({
    queryKey: deliveryChargeKeys.all,
    queryFn: deliveryChargesApi.list,
    staleTime: 5 * 60_000,
  });
