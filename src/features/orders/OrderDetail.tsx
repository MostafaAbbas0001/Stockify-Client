import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Printer, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
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
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { ordersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { orderActionsFor, orderStatusMeta } from "@/lib/enums";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";

type Action = "ship" | "deliver" | "cancel";

const ACTION_LABEL: Record<Action, string> = {
  ship: "orders.ship",
  deliver: "orders.deliver",
  cancel: "orders.cancel",
};

export function OrderDetail({ orderId }: { orderId: number }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const order = useQuery({
    queryKey: ["orders", "detail", orderId],
    queryFn: () => ordersApi.get(orderId),
  });

  const mutate = useMutation({
    mutationFn: (action: Action) => ordersApi.setStatus(orderId, action),
    onSuccess: () => {
      setConfirming(null);
      setActionError(null);
      toast.success(t("orders.statusUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error) => {
      const message = isApiError(error) ? error.message : (error as Error).message;
      setActionError(message);
      if (!confirming) toast.error(message);
    },
  });

  if (order.isPending) return <LoadingState />;
  if (order.isError) {
    if (isApiError(order.error) && order.error.isNotFound) {
      return (
        <EmptyState
          title={t("common.notFoundTitle")}
          description={t("common.notFoundBody")}
          action={
            <Link
              to="/orders"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              {t("common.backToList")}
            </Link>
          }
        />
      );
    }
    return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;
  }

  const detail = order.data;
  const status = orderStatusMeta({ statusName: detail.statusName });
  const actions = can(PERM.orderCreate) ? orderActionsFor(status.id) : [];
  const balance = detail.totalAmount - detail.paidAmount;

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/orders"
            className="print:hidden inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 rtl:rotate-180" />
            {t("orders.title")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              {t("orders.detailTitle")} {detail.orderNumber}
            </h1>
            <StatusBadge tone={status.meta?.tone ?? "neutral"}>
              {detail.statusName || (status.meta ? t(status.meta.key) : t("common.unavailable"))}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(detail.createdAt, locale)}
          </p>
        </div>

        <div className="print:hidden flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            <Printer className="size-4" />
            {t("common.print")}
          </button>
          {detail.invoiceId && can(PERM.invoiceView) && (
            <Link
              to="/invoices/$invoiceId"
              params={{ invoiceId: String(detail.invoiceId) }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Receipt className="size-4" />
              {t("orders.viewInvoice")}
            </Link>
          )}
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={mutate.isPending}
              onClick={() => {
                setActionError(null);
                if (action === "cancel") setConfirming("cancel");
                else mutate.mutate(action);
              }}
              className={
                action === "cancel"
                  ? "inline-flex h-10 items-center gap-2 rounded-lg border border-destructive/40 px-3 text-sm font-semibold text-destructive hover:bg-error-soft disabled:opacity-50"
                  : "inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              }
            >
              {mutate.isPending && mutate.variables === action && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t(ACTION_LABEL[action])}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("common.details")} />
            <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <KeyValue label={t("common.customer")} value={detail.customerName ?? "—"} />
              <KeyValue label={t("common.phone")} value={detail.customerPhone ?? "—"} />
              <KeyValue label={t("common.email")} value={detail.customerEmail ?? "—"} />
              <KeyValue label={t("common.address")} value={detail.customerAddress ?? "—"} />
              <KeyValue label={t("common.delivery")} value={detail.deliveryLocation ?? "—"} />
              <KeyValue label={t("orders.createdBy")} value={detail.createdByEmployeeName ?? "—"} />
              <KeyValue
                label={t("orders.shipped")}
                value={formatDateTime(detail.shippedAt, locale)}
              />
              <KeyValue
                label={t("orders.cancelled")}
                value={formatDateTime(detail.cancelledAt, locale)}
              />
            </dl>
          </Card>

          <Card>
            <CardHeader title={t("orders.items")} />
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th>SKU</Th>
                  <Th align="end">{t("common.quantity")}</Th>
                  <Th>{t("orders.lots")}</Th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.orderItemId}>
                    <Td>
                      <span className="block font-medium text-foreground">{item.productName}</span>
                      {item.attributes.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {item.attributes.join(" · ")}
                        </span>
                      )}
                    </Td>
                    <Td className="font-mono text-xs">{item.sku}</Td>
                    <Td align="end" className="font-numeric tabular-nums">
                      {formatNumber(item.quantity, locale)}
                    </Td>
                    <Td>
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {item.lots.map((lot) => (
                          <li key={lot.inventoryLotId}>
                            {lot.lotNumber ?? `#${lot.inventoryLotId}`} ·{" "}
                            {formatNumber(lot.quantity, locale)}
                            {lot.returnedQuantity > 0 && (
                              <span className="text-warning">
                                {" "}
                                ({t("invoices.returned")}{" "}
                                {formatNumber(lot.returnedQuantity, locale)})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </Card>

          <Card>
            <CardHeader title={t("orders.payments")} />
            {detail.payments.length === 0 ? (
              <div className="p-6">
                <EmptyState title={t("orders.noPayments")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("common.date")}</Th>
                    <Th>{t("common.method")}</Th>
                    <Th align="end">{t("invoices.amount")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.payments.map((payment, index) => (
                    <tr key={`${payment.paidAt}-${index}`}>
                      <Td>{formatDateTime(payment.paidAt, locale)}</Td>
                      <Td>{payment.method}</Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(payment.amount, locale, payment.currencySymbol)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        </div>

        <Card className="h-fit p-4">
          <MoneyRow label={t("common.subtotal")} value={formatMoney(detail.subtotal, locale)} />
          {detail.saleAmount > 0 && (
            <MoneyRow
              label={t("pos.saleDiscount")}
              value={`- ${formatMoney(detail.saleAmount, locale)}`}
              tone="success"
            />
          )}
          {detail.discountAmount > 0 && (
            <MoneyRow
              label={t("pos.orderDiscount")}
              value={`- ${formatMoney(detail.discountAmount, locale)}`}
              tone="success"
            />
          )}
          <MoneyRow label={t("common.tax")} value={formatMoney(detail.taxAmount, locale)} />
          <MoneyRow
            label={t("common.delivery")}
            value={formatMoney(detail.deliveryChargeAmount, locale)}
          />
          <div className="my-2 border-t border-border" />
          <MoneyRow
            label={t("common.total")}
            value={formatMoney(detail.totalAmount, locale)}
            strong
          />
          <MoneyRow
            label={t("common.paid")}
            value={formatMoney(detail.paidAmount, locale)}
            tone="success"
          />
          <MoneyRow
            label={t("common.balance")}
            value={formatMoney(balance, locale)}
            {...(balance > 0 ? { tone: "warning" as const } : {})}
          />
        </Card>
      </div>

      <ConfirmDialog
        open={confirming === "cancel"}
        title={t("orders.cancelConfirmTitle")}
        body={t("orders.cancelConfirmBody")}
        confirmLabel={t("orders.cancel")}
        tone="destructive"
        pending={mutate.isPending}
        error={actionError}
        onCancel={() => {
          setConfirming(null);
          setActionError(null);
        }}
        onConfirm={() => mutate.mutate("cancel")}
      />
    </div>
  );
}
