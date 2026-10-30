import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Printer, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { ErrorState, LoadingState } from "@/shared/components/DataStates";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  Card,
  CardHeader,
  KeyValue,
  MoneyRow,
  PageHeader,
  TableShell,
  Td,
  Th,
} from "@/shared/components/Surface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { ExpensePaymentDialog } from "@/features/finance/expenses/components/ExpensePaymentDialog";
import { useLookups } from "@/features/lookups/useLookups";
import { useI18n } from "@/shared/i18n";
import { expensesApi } from "@/features/finance/expenses/api";
import { isApiError } from "@/shared/api/errors";
import type { ExpenseLine, ExpenseLinePayment } from "@/features/finance/expenses/types";
import { formatDate, formatDateTime, formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/input";
import { Field, FormError } from "@/shared/ui/field";

export function ExpenseDetailScreen({ expenseId: id }: { expenseId: number }) {
  const { t, locale } = useI18n();
  const lookups = useLookups();
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
  if (detail.isPending)
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  if (detail.isError)
    return (
      <Card>
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </Card>
    );
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
      <PageHeader
        breadcrumbs={[
          { label: t("nav.expenses"), to: "/expenses" },
          { label: expense.expenseNumber ?? `#${expense.id}` },
        ]}
        title={expense.expenseNumber ?? `#${expense.id}`}
        description={expense.categoryName ?? t("common.unavailable")}
        actions={
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4" />
            {t("common.print")}
          </Button>
        }
      />
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
        <div className="grid gap-x-8 border-t border-border p-4 sm:grid-cols-3">
          <MoneyRow label={t("common.total")} value={formatMoney(total, locale)} />
          <MoneyRow label={t("common.paid")} value={formatMoney(paid, locale)} />
          <MoneyRow
            label={t("common.balance")}
            value={formatMoney(Math.max(0, total - paid), locale)}
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
              title={`${t("expenses.lineNumber", { number: index + 1 })}: ${line.categoryName ?? "—"}`}
              description={line.itemName || line.note || undefined}
              actions={
                remaining > 0 ? (
                  <Button
                    type="button"
                    onClick={() => setPaymentLine(line)}
                    size="sm"
                    className="print:hidden"
                  >
                    <CreditCard className="size-3.5" />
                    {t("expenses.addPayment")}
                  </Button>
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
                value={`${formatDate(line.expensePeriodStart, locale)} – ${formatDate(line.expensePeriodEnd, locale)}`}
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
                      <Th width="sm">{t("common.date")}</Th>
                      <Th width="sm">{t("expenses.paymentMethod")}</Th>
                      <Th>{t("expenses.reference")}</Th>
                      <Th align="end" width="sm">
                        {t("common.amount")}
                      </Th>
                      <Th width="md">{t("common.status")}</Th>
                      <Th align="end" actions className="print:hidden">
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
                          <Td>
                            {lookups.labelOf(
                              "paymentMethods",
                              payment.paymentMethodCode,
                              payment.paymentMethodName,
                            )}
                          </Td>
                          <Td>{payment.paymentReference ?? "—"}</Td>
                          <Td align="end" className="tabular-nums">
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
                                  <Button
                                    type="button"
                                    aria-label={t("expenses.approve")}
                                    onClick={() => {
                                      setActionError(null);
                                      setDecision({ payment, approve: true });
                                    }}
                                    variant="quiet"
                                    size="icon-sm"
                                  >
                                    <Check className="size-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    aria-label={t("expenses.reject")}
                                    onClick={() => {
                                      setActionError(null);
                                      setDecision({ payment, approve: false });
                                    }}
                                    variant="quiet"
                                    size="icon-sm"
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </>
                              )}
                              {pending && (
                                <Button
                                  type="button"
                                  aria-label={t("common.delete")}
                                  onClick={() => {
                                    setActionError(null);
                                    setRemoving(payment);
                                  }}
                                  variant="quiet-destructive"
                                  size="icon-sm"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
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
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {t(decision?.approve ? "expenses.approveTitle" : "expenses.rejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {t(decision?.approve ? "expenses.approveHint" : "expenses.rejectHint")}
            </DialogDescription>
          </DialogHeader>
          <FormError>{actionError}</FormError>
          {decision && !decision.approve && (
            <Field label={t("expenses.rejectionReason")}>
              <Textarea
                autoFocus
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </Field>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDecision(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={decision && !decision.approve ? "destructive" : "primary"}
              loading={decide.isPending}
              disabled={Boolean(decision && !decision.approve && !rejectionReason.trim())}
              onClick={() => decision && decide.mutate(decision)}
            >
              {t("common.confirm")}
            </Button>
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
