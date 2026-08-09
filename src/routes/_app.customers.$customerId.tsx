import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
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
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { CustomerFormDialog } from "@/features/customers/CustomerFormDialog";
import { useI18n } from "@/i18n";
import { customersApi, invoicesApi, ordersApi } from "@/lib/api/endpoints";
import type { InvoiceDetail, OrderRow } from "@/lib/api/types";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/customers/$customerId")({
  component: CustomerDetailRoute,
});
function CustomerDetailRoute() {
  return (
    <RequirePermission permission={TAB.customers}>
      <CustomerDetailScreen />
    </RequirePermission>
  );
}

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

function CustomerDetailScreen() {
  const id = Number(Route.useParams().customerId);
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
  if (customer.isPending) return <LoadingState />;
  if (customer.isError)
    return <ErrorState error={customer.error} onRetry={() => void customer.refetch()} />;
  const outstanding = (history.data?.invoices ?? []).reduce(
    (sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount),
    0,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/customers"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 rtl:rotate-180" />
            {t("customers.back")}
          </Link>
          <h1 className="text-lg font-semibold">{customer.data.name}</h1>
          <p className="text-sm text-muted-foreground">{t("customers.profileSubtitle")}</p>
        </div>
        {can(PERM.customerUpdate) && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold"
          >
            <Pencil className="size-4" />
            {t("common.edit")}
          </button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
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
              tone={outstanding > 0 ? "warning" : "success"}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <KeyValue
                label={t("customers.ordersCount")}
                value={history.data?.orders.length ?? "—"}
              />
              <KeyValue
                label={t("customers.invoicesCount")}
                value={history.data?.invoices.length ?? "—"}
              />
            </div>
          </div>
        </Card>
      </div>
      {history.isPending ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
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
                    <Th>{t("orders.orderNumber")}</Th>
                    <Th>{t("common.status")}</Th>
                    <Th>{t("common.delivery")}</Th>
                    <Th align="end">{t("common.total")}</Th>
                    <Th>{t("common.createdAt")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.orders.map((order) => (
                    <tr key={order.id}>
                      <Td>
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: String(order.id) }}
                          className="font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </Td>
                      <Td>
                        <StatusBadge tone="neutral">{order.statusName}</StatusBadge>
                      </Td>
                      <Td>{order.deliveryLocation ?? "—"}</Td>
                      <Td align="end" className="font-numeric">
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
                    <Th>{t("invoices.invoiceNumber")}</Th>
                    <Th>{t("common.status")}</Th>
                    <Th align="end">{t("common.total")}</Th>
                    <Th align="end">{t("common.paid")}</Th>
                    <Th align="end">{t("common.balance")}</Th>
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
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </Td>
                      <Td>
                        <StatusBadge tone="neutral">{invoice.statusName}</StatusBadge>
                      </Td>
                      <Td align="end">{formatMoney(invoice.totalAmount, locale)}</Td>
                      <Td align="end" className="text-success">
                        {formatMoney(invoice.paidAmount, locale)}
                      </Td>
                      <Td align="end" className="text-warning">
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
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
