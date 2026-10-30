import type { DeliveryCharge } from "@/features/settings/delivery-locations/types";
import { api } from "@/shared/api/client";

type DeliveryChargeRequest = { locationName: string; fee: number };

export const deliveryChargesApi = {
  list: () => api<DeliveryCharge[]>("delivery-charges"),
  create: (body: DeliveryChargeRequest) =>
    api<DeliveryCharge>("delivery-charges", { method: "POST", body }),
  update: (id: number, body: DeliveryChargeRequest) =>
    api<DeliveryCharge>(`delivery-charges/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`delivery-charges/${id}`, { method: "DELETE" }),
};
