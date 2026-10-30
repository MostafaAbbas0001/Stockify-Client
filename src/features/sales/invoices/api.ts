import type {
  InvoiceDetail,
  InvoiceRow,
  PaymentRequest,
  ReturnRequest,
} from "@/features/sales/invoices/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

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
