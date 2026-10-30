import type {
  TransferCreateRequest,
  TransferDispatchRequest,
  TransferReceiptRequest,
  TransferRow,
  TransferStatistics,
} from "@/features/inventory/transfers/types";
import { api } from "@/shared/api/client";
import { unwrapPaged } from "@/shared/api/paging";

export const stockTransfersApi = {
  list: async (query: {
    search?: string | undefined;
    branchId?: number | undefined;
    sourceBranchId?: number | undefined;
    destinationBranchId?: number | undefined;
    statusId?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: number | undefined;
  }) => unwrapPaged<TransferRow>(await api<unknown>("stock-transfers", { query }), "transfers"),
  get: (id: number) => api<TransferRow>(`stock-transfers/${id}`),
  statistics: (query: { branchId?: number | undefined }) =>
    api<TransferStatistics>("stock-transfers/statistics", { query }),
  create: (body: TransferCreateRequest) =>
    api<TransferRow>("stock-transfers", { method: "POST", body }),
  dispatch: (id: number, body: TransferDispatchRequest) =>
    api<unknown>(`stock-transfers/${id}/dispatches`, { method: "POST", body }),
  receive: (id: number, body: TransferReceiptRequest) =>
    api<unknown>(`stock-transfers/${id}/receipts`, { method: "POST", body }),
  cancel: (id: number, reason?: string) =>
    api<void>(`stock-transfers/${id}`, {
      method: "DELETE",
      query: { reason: reason || undefined },
    }),
  resolveDiscrepancy: (id: number, note: string) =>
    api<TransferRow>(`stock-transfers/${id}/discrepancy`, { method: "PUT", body: { note } }),
};
