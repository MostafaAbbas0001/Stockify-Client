import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, CreditCard, Printer, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/common/DataStates";
import { RequirePermission } from "@/components/common/RequirePermission";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Card,
  CardHeader,
  KeyValue,
  MoneyRow,
  TableShell,
  Td,
  Th,
} from "@/components/common/Surface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { ExpensePaymentDialog } from "@/features/expenses/ExpensePaymentDialog";
import { useI18n } from "@/i18n";
import { expensesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { ExpenseLine, ExpenseLinePayment } from "@/lib/api/types";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/expenses/$expenseId")({
  component: ExpenseDetailRoute,
});
function ExpenseDetailRoute() {
  return (
    <RequirePermission permission={TAB.expenses}>
      <ExpenseDetailScreen />
    </RequirePermission>
  );
}
function ExpenseDetailScreen() {
  const { expenseId } = Route.useParams();
  const id = Number(expenseId);
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [paymentLine, setPaymentLine] = useState<ExpenseLine | null>(null);
  const [decision, setDecision] = useState<{
    payment: ExpenseLinePayment;
    approve: boolean;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [removing, setRemoving] = useState<ExpenseLinePayment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["expenses", id],
    queryFn: () => expensesApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };
  const decide = useMutation({
    mutationFn: ({ payment, approve }: { payment: ExpenseLinePayment; approve: boolean }) =>
      expensesApi.decidePayment(payment.id, {
        isApproved: approve,
        rejectionReason: approve ? null : rejectionReason.trim(),
      }),
    onSuccess: (_, variables) => {
      toast.success(t(variables.approve ? "expenses.paymentApproved" : "expenses.paymentRejected"));
      invalidate();
      setDecision(null);
      setRejectionReason("");
    },
    onError: (error) =>
      setActionError(isApiError(error) ? error.message : (error as Error).message),
  });
  const remove = useMutation({
    mutationFn: (paymentId: number) => expensesApi.removePayment(paymentId),
    onSuccess: () => {
      toast.success(t("expenses.paymentDeleted"));
      invalidate();
      setRemoving(null);
    },
    onError: (error) =>
      setActionError(isApiError(error) ? error.message : (error as Error).message),
  });
  if (detail.isPending) return <LoadingState />;
  if (detail.isError)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;
  const expense = detail.data;
  const total = expense.lines.reduce((sum, line) => sum + line.totalAmount, 0);
  const paid = expense.lines.reduce(
    (sum, line) =>
      sum +
      line.payments
        .filter((payment) => payment.approvedAt && !payment.rejectionReason)
        .reduce((lineSum, payment) => lineSum + payment.amount, 0),
    0,
  );
  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Link
            to="/expenses"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 rtl:rotate-180" />
            {t("expenses.back")}
          </Link>
          <h1 className="text-lg font-semibold">{expense.expenseNumber ?? `#${expense.id}`}</h1>
          <p className="text-sm text-muted-foreground">
            {expense.categoryName ?? t("common.unavailable")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold"
        >
          <Printer className="size-4" />
          {t("common.print")}
        </button>
      </div>
      <Card>
        <CardHeader title={t("expenses.overview")} />
        <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <KeyValue label={t("expenses.headerCategory")} value={expense.categoryName ?? "—"} />
          <KeyValue label={t("expenses.createdBy")} value={expense.createdByUsername ?? "—"} />
          <KeyValue
            label={t("common.createdAt")}
            value={formatDateTime(expense.createdAt, locale)}
          />
          <KeyValue label={t("expenses.lines")} value={expense.lines.length} />
        </dl>
        <div className="border-t border-border p-4">
          <MoneyRow label={t("common.total")} value={formatMoney(total, locale)} strong />
          <MoneyRow label={t("common.paid")} value={formatMoney(paid, locale)} tone="success" />
          <MoneyRow
            label={t("common.balance")}
            value={formatMoney(Math.max(0, total - paid), locale)}
            strong
            tone="warning"
          />
        </div>
      </Card>
      {expense.lines.map((line, index) => {
        const approved = line.payments
          .filter((payment) => payment.approvedAt && !payment.rejectionReason)
          .reduce((sum, payment) => sum + payment.amount, 0);
        const remaining = Math.max(0, line.totalAmount - approved);
        return (
          <Card key={line.id}>
            <CardHeader
              title={`${t("expenses.lineNumber", { number: index + 1 })} · ${line.categoryName ?? "—"}`}
              description={line.itemName || line.note || undefined}
              actions={
                remaining > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPaymentLine(line)}
                    className="print:hidden inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground"
                  >
                    <CreditCard className="size-3.5" />
                    {t("expenses.addPayment")}
                  </button>
                ) : undefined
              }
            />
            <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <KeyValue
                label={t("common.total")}
                value={formatMoney(line.totalAmount, locale, line.currencySymbol)}
              />
              <KeyValue
                label={t("common.balance")}
                value={formatMoney(remaining, locale, line.currencySymbol)}
              />
              <KeyValue label={t("common.branch")} value={line.branchName ?? "—"} />
              <KeyValue
                label={t("expenses.period")}
                value={`${formatDate(line.expensePeriodStart, locale)} — ${formatDate(line.expensePeriodEnd, locale)}`}
              />
              {line.employeeName && (
                <KeyValue label={t("common.employee")} value={line.employeeName} />
              )}
              {line.supplierName && (
                <KeyValue label={t("expenses.supplier")} value={line.supplierName} />
              )}
              {line.referenceNumber && (
                <KeyValue label={t("expenses.reference")} value={line.referenceNumber} />
              )}
            </dl>
            {line.payments.length > 0 && (
              <div className="border-t border-border">
                <TableShell>
                  <thead>
                    <tr>
                      <Th>{t("common.date")}</Th>
                      <Th>{t("expenses.paymentMethod")}</Th>
                      <Th>{t("expenses.reference")}</Th>
                      <Th align="end">{t("common.amount")}</Th>
                      <Th>{t("common.status")}</Th>
                      <Th align="end" className="print:hidden">
                        {t("common.actions")}
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {line.payments.map((payment) => {
                      const pending = !payment.approvedAt;
                      const rejected = Boolean(payment.rejectionReason);
                      return (
                        <tr key={payment.id}>
                          <Td>{formatDate(payment.paymentDate, locale)}</Td>
                          <Td>{payment.paymentMethod}</Td>
                          <Td>{payment.paymentReference ?? "—"}</Td>
                          <Td align="end" className="font-numeric">
                            {formatMoney(payment.amount, locale, line.currencySymbol)}
                          </Td>
                          <Td>
                            <StatusBadge
                              tone={pending ? "warning" : rejected ? "error" : "success"}
                            >
                              {t(
                                pending
                                  ? "expenses.pending"
                                  : rejected
                                    ? "expenses.rejected"
                                    : "expenses.approved",
                              )}
                            </StatusBadge>
                            {rejected && (
                              <span className="ms-2 text-xs text-muted-foreground">
                                {payment.rejectionReason}
                              </span>
                            )}
                          </Td>
                          <Td align="end" className="print:hidden">
                            <div className="flex justify-end gap-1">
                              {pending && can(PERM.expenseDecisionSubmit) && (
                                <>
                                  <button
                                    type="button"
                                    aria-label={t("expenses.approve")}
                                    onClick={() => {
                                      setActionError(null);
                                      setDecision({ payment, approve: true });
                                    }}
                                    className="grid size-8 place-items-center text-success transition-colors hover:text-success/70"
                                  >
                                    <Check className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={t("expenses.reject")}
                                    onClick={() => {
                                      setActionError(null);
                                      setDecision({ payment, approve: false });
                                    }}
                                    className="grid size-8 place-items-center text-destructive transition-colors hover:text-destructive/70"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </>
                              )}
                              {pending && (
                                <button
                                  type="button"
                                  aria-label={t("common.delete")}
                                  onClick={() => {
                                    setActionError(null);
                                    setRemoving(payment);
                                  }}
                                  className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableShell>
              </div>
            )}
          </Card>
        );
      })}
      {paymentLine && (
        <ExpensePaymentDialog
          line={paymentLine}
          onOpenChange={(open) => !open && setPaymentLine(null)}
        />
      )}
      <Dialog open={Boolean(decision)} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(decision?.approve ? "expenses.approveTitle" : "expenses.rejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {t(decision?.approve ? "expenses.approveHint" : "expenses.rejectHint")}
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">
              {actionError}
            </p>
          )}
          {decision && !decision.approve && (
            <label className="space-y-1">
              <span className="text-xs font-medium">{t("expenses.rejectionReason")}</span>
              <textarea
                autoFocus
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          )}
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setDecision(null)}
              className="h-10 rounded-lg border border-border px-4 text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={
                decide.isPending ||
                Boolean(decision && !decision.approve && !rejectionReason.trim())
              }
              onClick={() => decision && decide.mutate(decision)}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t("common.confirm")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(removing)}
        title={t("expenses.deletePaymentTitle")}
        body={t("expenses.deletePaymentBody")}
        confirmLabel={t("common.delete")}
        tone="destructive"
        pending={remove.isPending}
        error={actionError}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}
