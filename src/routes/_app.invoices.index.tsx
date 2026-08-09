import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppSelect } from "@/components/common/AppSelect";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { RequirePermission } from "@/components/common/RequirePermission";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { TAB } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { invoicesApi } from "@/lib/api/endpoints";
import { InvoiceStatus, invoiceStatusMeta } from "@/lib/enums";
import { endOfDayIso, formatDateTime, formatMoney, startOfDayIso } from "@/lib/format";

export const Route = createFileRoute("/_app/invoices/")({
  component: InvoicesRoute,
});

const STATUS_OPTIONS = [
  InvoiceStatus.Issued,
  InvoiceStatus.PartiallyPaid,
  InvoiceStatus.FullyPaid,
  InvoiceStatus.Void,
  InvoiceStatus.WrittenOff,
  InvoiceStatus.Refunded,
  InvoiceStatus.PartiallyRefunded,
];

function InvoicesRoute() {
  return (
    <RequirePermission permission={TAB.invoices}>
      <InvoicesList />
    </RequirePermission>
  );
}

function InvoicesList() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState<number | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(1);

  const invoices = useQuery({
    queryKey: ["invoices", { search, statusId, start, end, page }],
    queryFn: () =>
      invoicesApi.list({
        search: search || undefined,
        statusId: statusId ?? undefined,
        startDate: start ? startOfDayIso(start) : undefined,
        endDate: end ? endOfDayIso(end) : undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  const filtered = Boolean(search || statusId || start || end);

  return (
    <div className="space-y-6">
      <PageHeader title={t("invoices.title")} description={t("invoices.subtitle")} />

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("invoices.searchPlaceholder")}
                className="min-w-64 flex-1"
              />
              <AppSelect
                value={statusId ?? ""}
                onChange={(event) => {
                  setStatusId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                aria-label={t("common.status")}
              >
                <option value="">{t("common.all")}</option>
                {STATUS_OPTIONS.map((id) => {
                  const status = invoiceStatusMeta({ statusId: id });
                  return (
                    <option key={id} value={id}>
                      {status.meta ? t(status.meta.key) : String(id)}
                    </option>
                  );
                })}
              </AppSelect>
              <input
                type="date"
                value={start}
                onChange={(event) => {
                  setStart(event.target.value);
                  setPage(1);
                }}
                aria-label={t("employees.rangeStart")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              />
              <input
                type="date"
                value={end}
                onChange={(event) => {
                  setEnd(event.target.value);
                  setPage(1);
                }}
                aria-label={t("employees.rangeEnd")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              />
            </div>
          }
        />

        {invoices.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : invoices.isError ? (
          <div className="p-6">
            <ErrorState error={invoices.error} onRetry={() => void invoices.refetch()} />
          </div>
        ) : invoices.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={filtered} title={t("invoices.noInvoices")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("invoices.invoiceNumber")}</Th>
                  <Th>{t("orders.orderNumber")}</Th>
                  <Th>{t("common.status")}</Th>
                  <Th align="end">{t("common.total")}</Th>
                  <Th align="end">{t("common.paid")}</Th>
                  <Th align="end">{t("common.balance")}</Th>
                  <Th>{t("common.date")}</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.data.items.map((invoice) => {
                  const status = invoiceStatusMeta({
                    statusId: invoice.invoiceStatusId,
                    statusName: invoice.statusName,
                  });
                  const balance = invoice.totalAmount - invoice.paidAmount;
                  return (
                    <tr key={invoice.id} className="border-t border-border hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: String(invoice.id) }}
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </Td>
                      <Td>{invoice.orderNumber ?? "—"}</Td>
                      <Td>
                        <StatusBadge tone={status.meta?.tone ?? "neutral"}>
                          {invoice.statusName ||
                            (status.meta ? t(status.meta.key) : t("common.unavailable"))}
                        </StatusBadge>
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatMoney(invoice.totalAmount, locale)}
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums text-success">
                        {formatMoney(invoice.paidAmount, locale)}
                      </Td>
                      <Td
                        align="end"
                        className={`font-numeric tabular-nums ${balance > 0 ? "text-warning" : ""}`}
                      >
                        {formatMoney(balance, locale)}
                      </Td>
                      <Td>{formatDateTime(invoice.issuedAt, locale)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={invoices.data.page}
              totalPages={invoices.data.totalPages}
              totalCount={invoices.data.totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
