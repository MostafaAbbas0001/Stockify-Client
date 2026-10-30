import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderDetail,
  OrderRow,
} from "@/features/sales/orders/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

export const ordersApi = {
  list: (query: {
    search?: string | undefined;
    statusId?: number | undefined;
    customerId?: number | undefined;
    branchId?: number | undefined;
    deliveryLocationId?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    forDeliveryOnly?: boolean | undefined;
    page?: number | undefined;
  }) => api<unknown>("orders", { query }).then((data) => unwrapPaged<OrderRow>(data, "orders")),
  get: (orderId: number) => api<OrderDetail>(`orders/${orderId}`),
  create: (body: CreateOrderRequest) =>
    api<CreateOrderResponse>("orders", { method: "POST", body }),
  setStatus: (orderId: number, action: "ship" | "deliver" | "cancel") =>
    api<{
      id: number;
      orderStatusId: number;
      shippedAt?: string | undefined;
      cancelledAt?: string | undefined;
    }>(`orders/${orderId}/status`, { method: "PATCH", body: { action } }),
};
