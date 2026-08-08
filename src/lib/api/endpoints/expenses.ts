import { api } from "../client";
import type { CreateExpenseRequest, ExpenseCategory, ExpenseDetail, ExpenseRow } from "../types";
import { unwrapPaged } from "./shared";

export const expensesApi = {
  list: (query: {
    search?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    categoryId?: number | undefined;
    branchId?: number | undefined;
    statusId?: number | undefined;
    page?: number | undefined;
  }) =>
    api<unknown>("expenses", { query }).then((data) => unwrapPaged<ExpenseRow>(data, "expenses")),
  get: (id: number) => api<ExpenseDetail>(`expenses/${id}`),
  categories: (parentId?: number) =>
    api<ExpenseCategory[]>("expenses/categories", { query: { parentId } }),
  create: (body: CreateExpenseRequest) =>
    api<{ id: number; lineCount: number }>("expenses", { method: "POST", body }),
  createPayment: (body: {
    expenseLineId: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    paymentReference?: string | null;
    notes?: string | null;
  }) => api<{ id: number }>("expenses/lines/payments", { method: "POST", body }),
  decidePayment: (
    paymentId: number,
    body: { isApproved: boolean; rejectionReason?: string | null },
  ) =>
    api<{ id: number; expenseLineId: number; expenseId: number; isApproved: boolean }>(
      `expenses/lines/payments/${paymentId}/decision`,
      { method: "POST", body },
    ),
  removePayment: (paymentId: number) =>
    api<void>(`expenses/lines/payments/${paymentId}`, { method: "DELETE" }),
};
