import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { LookupBadge } from "@/features/lookups/LookupBadge";
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
import { CustomerFormDialog } from "@/features/people/customers/components/CustomerFormDialog";
import { useI18n } from "@/shared/i18n";
import { customersApi } from "@/features/people/customers/api";
import { invoicesApi } from "@/features/sales/invoices/api";
import { ordersApi } from "@/features/sales/orders/api";
import type { InvoiceDetail } from "@/features/sales/invoices/types";
import type { OrderRow } from "@/features/sales/orders/types";
import { formatDate, formatDateTime, formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

async function loadHistory(
  customerId: number,
): Promise<{ orders: OrderRow[]; invoices: InvoiceDetail[] }> {
  const first = await ordersApi.list({ customerId, page: 1 });
  const rest =
    first.totalPages > 1
      ? await Promise.all(
          Array.from({ length: first.totalPages - 1 }, (_, index) =>
            ordersApi.list({ customerId, page: index + 2 }),
          ),
        )
      : [];
  const orders = [first, ...rest].flatMap((page) => page.items);
  const details = await Promise.all(orders.map((order) => ordersApi.get(order.id)));
  const invoiceIds = [
    ...new Set(details.flatMap((order) => (order.invoiceId ? [order.invoiceId] : []))),
  ];
  const invoices = await Promise.all(invoiceIds.map((invoiceId) => invoicesApi.get(invoiceId)));
  return { orders, invoices };
}

export function CustomerDetailScreen({ customerId: id }: { customerId: number }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);
  const customer = useQuery({
    queryKey: ["customers", id],
    queryFn: () => customersApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
  const history = useQuery({
    queryKey: ["customers", id, "history"],
    queryFn: () => loadHistory(id),
    enabled: customer.isSuccess,
  });
  if (customer.isPending)
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  if (customer.isError)
    return (
      <Card>
        <ErrorState error={customer.error} onRetry={() => void customer.refetch()} />
      </Card>
    );
  const outstanding = (history.data?.invoices ?? []).reduce(
    (sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount),
    0,
  );
  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: t("nav.customers"), to: "/customers" },
          { label: customer.data.name },
        ]}
        title={customer.data.name}
        description={t("customers.profileSubtitle")}
        actions={
          can(PERM.customerUpdate) && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              {t("common.edit")}
            </Button>
          )
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader title={t("customers.contactDetails")} />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Contact icon={UserRound} label={t("common.name")} value={customer.data.name} />
            <Contact icon={Phone} label={t("common.phone")} value={customer.data.phone || "—"} />
            <Contact icon={Mail} label={t("common.email")} value={customer.data.email || "—"} />
            <Contact
              icon={MapPin}
              label={t("common.address")}
              value={customer.data.address || "—"}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title={t("customers.accountSummary")} />
          <div className="p-4">
            <MoneyRow
              label={t("customers.outstandingBalance")}
              value={history.isPending ? t("common.loading") : formatMoney(outstanding, locale)}
              strong
            />
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
              <KeyValue
                label={t("customers.ordersCount")}
                value={history.data?.orders.length ?? "—"}
              />
              <KeyValue
                label={t("customers.invoicesCount")}
                value={history.data?.invoices.length ?? "—"}
              />
            </dl>
          </div>
        </Card>
      </div>
      {history.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : history.isError ? (
        <Card>
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title={t("customers.orderHistory")} />
            {history.data.orders.length === 0 ? (
              <div className="p-5">
                <EmptyState title={t("customers.noHistory")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th width="sm">{t("orders.orderNumber")}</Th>
                    <Th width="md">{t("common.status")}</Th>
                    <Th>{t("common.delivery")}</Th>
                    <Th align="end" width="sm">
                      {t("common.total")}
                    </Th>
                    <Th width="lg">{t("common.createdAt")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.orders.map((order) => (
                    <tr key={order.id}>
                      <Td>
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: String(order.id) }}
                          className="font-medium text-primary-strong underline-offset-4 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </Td>
                      <Td>
                        <LookupBadge
                          list="orderStatuses"
                          code={order.statusCode}
                          fallback={order.statusName}
                        />
                      </Td>
                      <Td>{order.deliveryLocation ?? "—"}</Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(order.totalAmount, locale)}
                      </Td>
                      <Td>{formatDateTime(order.createdAt, locale)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
          <Card>
            <CardHeader title={t("customers.invoiceHistory")} />
            {history.data.invoices.length === 0 ? (
              <div className="p-5">
                <EmptyState title={t("customers.noInvoices")} />
              </div>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th width="sm">{t("invoices.invoiceNumber")}</Th>
                    <Th width="md">{t("common.status")}</Th>
                    <Th align="end" width="sm">
                      {t("common.total")}
                    </Th>
                    <Th align="end" width="sm">
                      {t("common.paid")}
                    </Th>
                    <Th align="end" width="sm">
                      {t("common.balance")}
                    </Th>
                    <Th>{t("common.date")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <Td>
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: String(invoice.id) }}
                          className="font-medium text-primary-strong underline-offset-4 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </Td>
                      <Td>
                        <LookupBadge
                          list="invoiceStatuses"
                          code={invoice.statusCode}
                          fallback={invoice.statusName}
                        />
                      </Td>
                      <Td align="end">{formatMoney(invoice.totalAmount, locale)}</Td>
                      <Td align="end" className="text-foreground">
                        {formatMoney(invoice.paidAmount, locale)}
                      </Td>
                      <Td align="end" className="text-foreground">
                        {formatMoney(Math.max(0, invoice.totalAmount - invoice.paidAmount), locale)}
                      </Td>
                      <Td>{formatDate(invoice.issuedAt, locale)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        </>
      )}
      {editing && (
        <CustomerFormDialog open={editing} onOpenChange={setEditing} customer={customer.data} />
      )}
    </div>
  );
}

function Contact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
