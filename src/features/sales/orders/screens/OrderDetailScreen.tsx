import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Printer, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
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
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { LookupBadge } from "@/features/lookups/LookupBadge";
import { useLookups } from "@/features/lookups/useLookups";
import { useI18n } from "@/shared/i18n";
import { ordersApi } from "@/features/sales/orders/api";
import type { OrderAction } from "@/features/sales/orders/types";
import { isApiError } from "@/shared/api/errors";
import { formatDateTime, formatMoney, formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { buttonVariants } from "@/shared/ui/variants";

const ACTION_LABEL: Record<OrderAction, string> = {
  ship: "orders.ship",
  deliver: "orders.deliver",
  cancel: "orders.cancel",
};

export function OrderDetailScreen({ orderId }: { orderId: number }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const lookups = useLookups();
  const [confirming, setConfirming] = useState<OrderAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const order = useQuery({
    queryKey: ["orders", "detail", orderId],
    queryFn: () => ordersApi.get(orderId),
  });

  const mutate = useMutation({
    mutationFn: (action: OrderAction) => ordersApi.setStatus(orderId, action),
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

  if (order.isPending)
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  if (order.isError) {
    if (isApiError(order.error) && order.error.isNotFound) {
      return (
        <EmptyState
          title={t("common.notFoundTitle")}
          description={t("common.notFoundBody")}
          action={
            <Link to="/orders" className={buttonVariants({ variant: "outline" })}>
              {t("common.backToList")}
            </Link>
          }
        />
      );
    }
    return (
      <Card>
        <ErrorState error={order.error} onRetry={() => void order.refetch()} />
      </Card>
    );
  }

  const detail = order.data;
  const actions = can(PERM.orderCreate) ? detail.allowedActions : [];
  const balance = detail.totalAmount - detail.paidAmount;

  return (
    <div className="space-y-4 print:space-y-2">
      <PageHeader
        breadcrumbs={[{ label: t("orders.title"), to: "/orders" }, { label: detail.orderNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t("orders.detailTitle")} {detail.orderNumber}
            <LookupBadge
              list="orderStatuses"
              code={detail.statusCode}
              fallback={detail.statusName}
            />
          </span>
        }
        description={formatDateTime(detail.createdAt, locale)}
        actions={
          <div className="print:hidden flex w-full flex-wrap items-center gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t("common.print")}
            </Button>
            {detail.invoiceId && can(PERM.invoiceView) && (
              <Link
                to="/invoices/$invoiceId"
                params={{ invoiceId: String(detail.invoiceId) }}
                className={buttonVariants({ variant: "outline" })}
              >
                <Receipt className="size-4" />
                {t("orders.viewInvoice")}
              </Link>
            )}
            {actions.map((action) =>
              action === "cancel" ? (
                <Button
                  key={action}
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={mutate.isPending}
                  onClick={() => {
                    setActionError(null);
                    setConfirming("cancel");
                  }}
                >
                  {t(ACTION_LABEL[action])}
                </Button>
              ) : (
                <Button
                  key={action}
                  loading={mutate.isPending && mutate.variables === action}
                  disabled={mutate.isPending}
                  onClick={() => {
                    setActionError(null);
                    mutate.mutate(action);
                  }}
                >
                  {t(ACTION_LABEL[action])}
                </Button>
              ),
            )}
          </div>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
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
                  <Th width="lg">SKU</Th>
                  <Th align="end" width="xs">
                    {t("common.quantity")}
                  </Th>
                  <Th width="md">{t("orders.lots")}</Th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.orderItemId}>
                    <Td>
                      <span className="block font-medium text-foreground">{item.productName}</span>
                      {item.attributes.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {item.attributes.join(" / ")}
                        </span>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">{item.sku}</Td>
                    <Td align="end" className="tabular-nums">
                      {formatNumber(item.quantity, locale)}
                    </Td>
                    <Td>
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {item.lots.map((lot) => (
                          <li key={lot.inventoryLotId}>
                            {lot.lotNumber ?? `#${lot.inventoryLotId}`} (
                            {formatNumber(lot.quantity, locale)})
                            {lot.returnedQuantity > 0 && (
                              <span className="text-foreground">
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
              <div>
                <EmptyState title={t("orders.noPayments")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th width="lg">{t("common.date")}</Th>
                    <Th>{t("common.method")}</Th>
                    <Th align="end" width="sm">
                      {t("invoices.amount")}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.payments.map((payment, index) => (
                    <tr key={`${payment.paidAt}-${index}`}>
                      <Td>{formatDateTime(payment.paidAt, locale)}</Td>
                      <Td>
                        {lookups.labelOf(
                          "paymentMethods",
                          payment.paymentMethodCode,
                          payment.paymentMethodName,
                        )}
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(payment.amount, locale, payment.currencySymbol)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        </div>

        <Card className="p-4 lg:sticky lg:top-0">
          <MoneyRow label={t("common.subtotal")} value={formatMoney(detail.subtotal, locale)} />
          {detail.saleAmount > 0 && (
            <MoneyRow
              label={t("pos.saleDiscount")}
              value={`−${formatMoney(detail.saleAmount, locale)}`}
            />
          )}
          {detail.discountAmount > 0 && (
            <MoneyRow
              label={t("pos.orderDiscount")}
              value={`−${formatMoney(detail.discountAmount, locale)}`}
            />
          )}
          <MoneyRow label={t("common.tax")} value={formatMoney(detail.taxAmount, locale)} />
          <MoneyRow
            label={t("common.delivery")}
            value={formatMoney(detail.deliveryChargeAmount, locale)}
          />
          <div className="my-3 border-t border-border" />
          <MoneyRow
            label={t("common.total")}
            value={formatMoney(detail.totalAmount, locale)}
            strong
          />
          <MoneyRow label={t("common.paid")} value={formatMoney(detail.paidAmount, locale)} />
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
