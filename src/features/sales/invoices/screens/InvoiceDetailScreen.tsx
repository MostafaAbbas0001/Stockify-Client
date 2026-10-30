import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardList, CreditCard, Printer, Undo2 } from "lucide-react";
import { useState } from "react";

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
import { InvoicePaymentDialog } from "@/features/sales/invoices/components/InvoicePaymentDialog";
import { InvoiceReturnDialog } from "@/features/sales/invoices/components/InvoiceReturnDialog";
import { useAuth } from "@/features/auth/context/AuthContext";
import { InvoiceStatusCode } from "@/features/lookups/codes";
import { LookupBadge } from "@/features/lookups/LookupBadge";
import { useLookups } from "@/features/lookups/useLookups";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/shared/i18n";
import { invoicesApi } from "@/features/sales/invoices/api";
import { isApiError } from "@/shared/api/errors";
import { formatDateTime, formatMoney, formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { buttonVariants } from "@/shared/ui/variants";

export function InvoiceDetailScreen({ invoiceId }: { invoiceId: number }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const lookups = useLookups();
  const [paying, setPaying] = useState(false);
  const [returning, setReturning] = useState(false);

  const invoice = useQuery({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
  });

  if (invoice.isPending)
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  if (invoice.isError) {
    if (isApiError(invoice.error) && invoice.error.isNotFound) {
      return (
        <EmptyState
          title={t("common.notFoundTitle")}
          description={t("common.notFoundBody")}
          action={
            <Link to="/invoices" className={buttonVariants({ variant: "outline" })}>
              {t("common.backToList")}
            </Link>
          }
        />
      );
    }
    return (
      <Card>
        <ErrorState error={invoice.error} onRetry={() => void invoice.refetch()} />
      </Card>
    );
  }

  const detail = invoice.data;
  const items = detail.invoiceItems ?? detail.items ?? [];
  const payments = detail.payments ?? [];
  const creditMemos = detail.creditMemos ?? [];
  const remaining = detail.totalAmount - detail.paidAmount;
  const closed =
    detail.statusCode === InvoiceStatusCode.Void ||
    detail.statusCode === InvoiceStatusCode.WrittenOff;
  const returnable = items.some((item) => item.quantity - (item.returnedQuantity ?? 0) > 0);

  return (
    <div className="space-y-4 print:space-y-2">
      <PageHeader
        breadcrumbs={[
          { label: t("invoices.title"), to: "/invoices" },
          { label: detail.invoiceNumber },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t("invoices.detailTitle")} {detail.invoiceNumber}
            <LookupBadge
              list="invoiceStatuses"
              code={detail.statusCode}
              fallback={detail.statusName}
            />
          </span>
        }
        description={formatDateTime(detail.issuedAt, locale)}
        actions={
          <div className="print:hidden flex w-full flex-wrap items-center gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t("common.print")}
            </Button>
            {detail.orderId && can(PERM.orderView) && (
              <Link
                to="/orders/$orderId"
                params={{ orderId: String(detail.orderId) }}
                className={buttonVariants({ variant: "outline" })}
              >
                <ClipboardList className="size-4" />
                {detail.orderNumber ?? t("orders.detailTitle")}
              </Link>
            )}
            {returnable && !closed && can(PERM.invoiceCreate) && (
              <Button variant="outline" onClick={() => setReturning(true)}>
                <Undo2 className="size-4" />
                {t("invoices.returnItems")}
              </Button>
            )}
            {remaining > 0 && !closed && can(PERM.invoicePaymentAdd) && (
              <Button onClick={() => setPaying(true)}>
                <CreditCard className="size-4" />
                {t("invoices.recordPayment")}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
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
              <div>
                <EmptyState />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("common.name")}</Th>
                    <Th align="end" width="xs">
                      {t("common.quantity")}
                    </Th>
                    <Th align="end" width="xs">
                      {t("invoices.returned")}
                    </Th>
                    <Th align="end" width="sm">
                      {t("common.price")}
                    </Th>
                    <Th align="end" width="sm">
                      {t("common.tax")}
                    </Th>
                    <Th align="end" width="sm">
                      {t("common.total")}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.invoiceItemId ?? item.id ?? index}>
                      <Td>
                        <span className="block font-medium text-foreground">
                          {item.productName ?? "—"}
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {item.sku ?? ""}
                        </span>
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatNumber(item.quantity, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatNumber(item.returnedQuantity ?? 0, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(item.unitPrice ?? item.price ?? 0, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(item.taxAmount ?? 0, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums">
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
              <div>
                <EmptyState title={t("orders.noPayments")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th width="lg">{t("common.date")}</Th>
                    <Th width="sm">{t("common.method")}</Th>
                    <Th>{t("common.reference")}</Th>
                    <Th align="end" width="sm">
                      {t("invoices.amount")}
                    </Th>
                    <Th align="end" width="sm">
                      {t("invoices.baseEquivalent")}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr key={payment.id ?? `${payment.paidAt}-${index}`}>
                      <Td>{formatDateTime(payment.paidAt, locale)}</Td>
                      <Td>
                        {lookups.labelOf(
                          "paymentMethods",
                          payment.paymentMethodCode,
                          payment.paymentMethodName,
                        )}
                      </Td>
                      <Td className="text-muted-foreground">{payment.reference ?? "—"}</Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(payment.amount, locale, payment.currencySymbol)}
                      </Td>
                      <Td align="end" className="tabular-nums">
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
              <div>
                <EmptyState title={t("invoices.noCreditMemos")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th width="sm">{t("invoices.invoiceNumber")}</Th>
                    <Th width="lg">{t("common.date")}</Th>
                    <Th>{t("common.reason")}</Th>
                    <Th align="end" width="sm">
                      {t("common.total")}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {creditMemos.map((memo, index) => (
                    <tr key={memo.id ?? index}>
                      <Td>{memo.creditMemoNumber ?? `#${memo.id ?? index + 1}`}</Td>
                      <Td>{formatDateTime(memo.issuedAt ?? memo.createdAt, locale)}</Td>
                      <Td className="text-muted-foreground">{memo.reason ?? "—"}</Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(memo.totalAmount ?? 0, locale)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        </div>

        <Card className="p-4 lg:sticky lg:top-0">
          <MoneyRow
            label={t("common.subtotal")}
            value={formatMoney(detail.subtotal ?? 0, locale)}
          />
          {(detail.saleAmount ?? 0) > 0 && (
            <MoneyRow
              label={t("pos.saleDiscount")}
              value={`−${formatMoney(detail.saleAmount ?? 0, locale)}`}
            />
          )}
          {(detail.discountAmount ?? 0) > 0 && (
            <MoneyRow
              label={t("pos.orderDiscount")}
              value={`−${formatMoney(detail.discountAmount ?? 0, locale)}`}
            />
          )}
          <MoneyRow label={t("common.tax")} value={formatMoney(detail.taxAmount ?? 0, locale)} />
          <MoneyRow
            label={t("common.delivery")}
            value={formatMoney(detail.deliveryChargeAmount ?? 0, locale)}
          />
          <div className="my-3 border-t border-border" />
          <MoneyRow
            label={t("common.total")}
            value={formatMoney(detail.totalAmount, locale)}
            strong
          />
          <MoneyRow label={t("common.paid")} value={formatMoney(detail.paidAmount, locale)} />
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
