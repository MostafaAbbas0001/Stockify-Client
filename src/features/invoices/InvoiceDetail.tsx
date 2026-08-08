import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ClipboardList, CreditCard, Printer, Undo2 } from "lucide-react";
import { useState } from "react";

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
import { InvoicePaymentDialog } from "./InvoicePaymentDialog";
import { InvoiceReturnDialog } from "./InvoiceReturnDialog";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { invoicesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { InvoiceStatus, invoiceStatusMeta } from "@/lib/enums";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";

export function InvoiceDetail({ invoiceId }: { invoiceId: number }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const [paying, setPaying] = useState(false);
  const [returning, setReturning] = useState(false);

  const invoice = useQuery({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
  });

  if (invoice.isPending) return <LoadingState />;
  if (invoice.isError) {
    if (isApiError(invoice.error) && invoice.error.isNotFound) {
      return (
        <EmptyState
          title={t("common.notFoundTitle")}
          description={t("common.notFoundBody")}
          action={
            <Link
              to="/invoices"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              {t("common.backToList")}
            </Link>
          }
        />
      );
    }
    return <ErrorState error={invoice.error} onRetry={() => void invoice.refetch()} />;
  }

  const detail = invoice.data;
  const status = invoiceStatusMeta({
    statusId: detail.invoiceStatusId,
    statusName: detail.statusName,
  });
  const items = detail.invoiceItems ?? detail.items ?? [];
  const payments = detail.payments ?? [];
  const creditMemos = detail.creditMemos ?? [];
  const remaining = detail.totalAmount - detail.paidAmount;
  const closed =
    detail.invoiceStatusId === InvoiceStatus.Void ||
    detail.invoiceStatusId === InvoiceStatus.WrittenOff;
  const returnable = items.some((item) => item.quantity - (item.returnedQuantity ?? 0) > 0);

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/invoices"
            className="print:hidden inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 rtl:rotate-180" />
            {t("invoices.title")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              {t("invoices.detailTitle")} {detail.invoiceNumber}
            </h1>
            <StatusBadge tone={status.meta?.tone ?? "neutral"}>
              {detail.statusName || (status.meta ? t(status.meta.key) : t("common.unavailable"))}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">{formatDateTime(detail.issuedAt, locale)}</p>
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
          {detail.orderId && can(PERM.orderView) && (
            <Link
              to="/orders/$orderId"
              params={{ orderId: String(detail.orderId) }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              <ClipboardList className="size-4" />
              {detail.orderNumber ?? t("orders.detailTitle")}
            </Link>
          )}
          {returnable && !closed && can(PERM.invoiceCreate) && (
            <button
              type="button"
              onClick={() => setReturning(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Undo2 className="size-4" />
              {t("invoices.returnItems")}
            </button>
          )}
          {remaining > 0 && !closed && can(PERM.invoicePaymentAdd) && (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <CreditCard className="size-4" />
              {t("invoices.recordPayment")}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("common.details")} description={t("invoices.snapshotNote")} />
            <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <KeyValue label={t("common.customer")} value={detail.customerName ?? "—"} />
              <KeyValue label={t("common.phone")} value={detail.customerPhone ?? "—"} />
              <KeyValue label={t("common.email")} value={detail.customerEmail ?? "—"} />
              <KeyValue label={t("common.branch")} value={detail.branchName ?? "—"} />
              <KeyValue
                label={t("common.employee")}
                value={detail.employeeName ?? detail.createdByEmployeeName ?? "—"}
              />
              <KeyValue label={t("orders.orderNumber")} value={detail.orderNumber ?? "—"} />
            </dl>
          </Card>

          <Card>
            <CardHeader title={t("orders.items")} />
            {items.length === 0 ? (
              <div className="p-6">
                <EmptyState />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("common.name")}</Th>
                    <Th align="end">{t("common.quantity")}</Th>
                    <Th align="end">{t("invoices.returned")}</Th>
                    <Th align="end">{t("common.price")}</Th>
                    <Th align="end">{t("common.tax")}</Th>
                    <Th align="end">{t("common.total")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.invoiceItemId ?? item.id ?? index}>
                      <Td>
                        <span className="block font-medium text-foreground">
                          {item.productName ?? "—"}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {item.sku ?? ""}
                        </span>
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatNumber(item.quantity, locale)}
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatNumber(item.returnedQuantity ?? 0, locale)}
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(item.unitPrice ?? item.price ?? 0, locale)}
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(item.taxAmount ?? 0, locale)}
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(item.totalAmount ?? 0, locale)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>

          <Card>
            <CardHeader title={t("orders.payments")} />
            {payments.length === 0 ? (
              <div className="p-6">
                <EmptyState title={t("orders.noPayments")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("common.date")}</Th>
                    <Th>{t("common.method")}</Th>
                    <Th>{t("common.reference")}</Th>
                    <Th align="end">{t("invoices.amount")}</Th>
                    <Th align="end">{t("invoices.baseEquivalent")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr key={payment.id ?? `${payment.paidAt}-${index}`}>
                      <Td>{formatDateTime(payment.paidAt, locale)}</Td>
                      <Td>{payment.method}</Td>
                      <Td className="text-xs text-muted-foreground">{payment.reference ?? "—"}</Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(payment.amount, locale, payment.currencySymbol)}
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(payment.baseAmount ?? payment.amount, locale)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>

          <Card>
            <CardHeader title={t("invoices.creditMemos")} />
            {creditMemos.length === 0 ? (
              <div className="p-6">
                <EmptyState title={t("invoices.noCreditMemos")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("invoices.invoiceNumber")}</Th>
                    <Th>{t("common.date")}</Th>
                    <Th>{t("common.reason")}</Th>
                    <Th align="end">{t("common.total")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {creditMemos.map((memo, index) => (
                    <tr key={memo.id ?? index}>
                      <Td>{memo.creditMemoNumber ?? `#${memo.id ?? index + 1}`}</Td>
                      <Td>{formatDateTime(memo.issuedAt ?? memo.createdAt, locale)}</Td>
                      <Td className="text-xs text-muted-foreground">{memo.reason ?? "—"}</Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(memo.totalAmount ?? 0, locale)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        </div>

        <Card className="h-fit p-4">
          <MoneyRow
            label={t("common.subtotal")}
            value={formatMoney(detail.subtotal ?? 0, locale)}
          />
          {(detail.saleAmount ?? 0) > 0 && (
            <MoneyRow
              label={t("pos.saleDiscount")}
              value={`- ${formatMoney(detail.saleAmount ?? 0, locale)}`}
              tone="success"
            />
          )}
          {(detail.discountAmount ?? 0) > 0 && (
            <MoneyRow
              label={t("pos.orderDiscount")}
              value={`- ${formatMoney(detail.discountAmount ?? 0, locale)}`}
              tone="success"
            />
          )}
          <MoneyRow label={t("common.tax")} value={formatMoney(detail.taxAmount ?? 0, locale)} />
          <MoneyRow
            label={t("common.delivery")}
            value={formatMoney(detail.deliveryChargeAmount ?? 0, locale)}
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
            label={t("invoices.remaining")}
            value={formatMoney(remaining, locale)}
            {...(remaining > 0 ? { tone: "warning" as const } : {})}
          />
        </Card>
      </div>

      <InvoicePaymentDialog
        open={paying}
        onOpenChange={setPaying}
        invoiceId={invoiceId}
        remaining={remaining}
      />
      <InvoiceReturnDialog
        open={returning}
        onOpenChange={setReturning}
        invoiceId={invoiceId}
        items={items}
      />
    </div>
  );
}
