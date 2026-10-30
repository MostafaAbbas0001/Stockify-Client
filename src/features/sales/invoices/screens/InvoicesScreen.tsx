import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppSelect } from "@/shared/components/AppSelect";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { LookupBadge } from "@/features/lookups/LookupBadge";
import { useLookups } from "@/features/lookups/useLookups";
import { useI18n } from "@/shared/i18n";
import { invoicesApi } from "@/features/sales/invoices/api";
import { endOfDayIso, formatDateTime, formatMoney, startOfDayIso } from "@/shared/lib/format";
import { Input } from "@/shared/ui/input";

export function InvoicesScreen() {
  const { t, locale } = useI18n();
  const lookups = useLookups();
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
    <div className="space-y-4">
      <PageHeader title={t("invoices.title")} description={t("invoices.subtitle")} />

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
              <SearchInput
                className="col-span-2 md:w-64"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("invoices.searchPlaceholder")}
              />
              <AppSelect
                value={statusId ?? ""}
                onChange={(event) => {
                  setStatusId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                className="w-full md:w-44"
                aria-label={t("common.status")}
              >
                <option value="">{t("common.all")}</option>
                {lookups.list("invoiceStatuses").map((status) => (
                  <option key={status.id} value={status.id}>
                    {lookups.label("invoiceStatuses", status)}
                  </option>
                ))}
              </AppSelect>
              <Input
                type="date"
                value={start}
                onChange={(event) => {
                  setStart(event.target.value);
                  setPage(1);
                }}
                aria-label={t("employees.rangeStart")}
                className="md:w-40"
              />
              <Input
                type="date"
                value={end}
                onChange={(event) => {
                  setEnd(event.target.value);
                  setPage(1);
                }}
                aria-label={t("employees.rangeEnd")}
                className="md:w-40"
              />
            </div>
          }
        />

        {invoices.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : invoices.isError ? (
          <div>
            <ErrorState error={invoices.error} onRetry={() => void invoices.refetch()} />
          </div>
        ) : invoices.data.items.length === 0 ? (
          <div>
            <EmptyState filtered={filtered} title={t("invoices.noInvoices")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th width="sm">{t("invoices.invoiceNumber")}</Th>
                  <Th width="sm">{t("orders.orderNumber")}</Th>
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
                {invoices.data.items.map((invoice) => {
                  const balance = invoice.totalAmount - invoice.paidAmount;
                  return (
                    <tr key={invoice.id} className="hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: String(invoice.id) }}
                          className="font-medium text-primary-strong underline-offset-4 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </Td>
                      <Td>{invoice.orderNumber ?? "—"}</Td>
                      <Td>
                        <LookupBadge
                          list="invoiceStatuses"
                          code={invoice.statusCode}
                          fallback={invoice.statusName}
                        />
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(invoice.totalAmount, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums text-foreground">
                        {formatMoney(invoice.paidAmount, locale)}
                      </Td>
                      <Td
                        align="end"
                        className={`tabular-nums ${balance > 0 ? "text-foreground" : ""}`}
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
