import { api } from "../client";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  InvoiceDetail,
  InvoiceRow,
  OrderDetail,
  OrderRow,
  PaymentRequest,
  ReturnRequest,
} from "../types";
import { unwrapPaged } from "./shared";

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

export const invoicesApi = {
  list: (query: {
    search?: string | undefined;
    statusId?: number | undefined;
    customerId?: number | undefined;
    orderId?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
  }) =>
    api<unknown>("invoices", { query }).then((data) => unwrapPaged<InvoiceRow>(data, "invoices")),
  get: (invoiceId: number) => api<InvoiceDetail>(`invoices/${invoiceId}`),
  addPayment: (invoiceId: number, body: PaymentRequest) =>
    api<{ invoiceId: number; invoiceNumber: string; paidAmountBase: number }>(
      `invoices/${invoiceId}/payments`,
      { method: "POST", body },
    ),
  createReturn: (invoiceId: number, body: ReturnRequest) =>
    api<unknown>(`invoices/${invoiceId}/returns`, { method: "POST", body }),
};
