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
import { ordersApi } from "@/features/sales/orders/api";
import { formatDateTime, formatMoney } from "@/shared/lib/format";

export function OrdersScreen() {
  const { t, locale } = useI18n();
  const lookups = useLookups();
  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState<number | null>(null);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [page, setPage] = useState(1);

  const orders = useQuery({
    queryKey: ["orders", { search, statusId, deliveryOnly, page }],
    queryFn: () =>
      ordersApi.list({
        search: search || undefined,
        statusId: statusId ?? undefined,
        forDeliveryOnly: deliveryOnly || undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <PageHeader title={t("orders.title")} description={t("orders.subtitle")} />

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
                placeholder={t("orders.searchPlaceholder")}
              />
              <AppSelect
                value={statusId ?? ""}
                onChange={(event) => {
                  setStatusId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                className="col-span-2 w-full md:col-span-1 md:w-44"
                aria-label={t("orders.statusFilter")}
              >
                <option value="">{t("common.all")}</option>
                {lookups.list("orderStatuses").map((status) => (
                  <option key={status.id} value={status.id}>
                    {lookups.label("orderStatuses", status)}
                  </option>
                ))}
              </AppSelect>
              <label className="col-span-2 flex h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-control bg-muted px-3.5 text-[13px] font-medium text-foreground md:col-span-1 md:h-9">
                <input
                  type="checkbox"
                  checked={deliveryOnly}
                  onChange={(event) => {
                    setDeliveryOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="size-4"
                />
                {t("orders.deliveryOnly")}
              </label>
            </div>
          }
        />

        {orders.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : orders.isError ? (
          <div>
            <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
          </div>
        ) : orders.data.items.length === 0 ? (
          <div>
            <EmptyState
              filtered={Boolean(search || statusId || deliveryOnly)}
              title={t("orders.noOrders")}
            />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th width="sm">{t("orders.orderNumber")}</Th>
                  <Th>{t("common.customer")}</Th>
                  <Th width="md">{t("common.status")}</Th>
                  <Th width="md">{t("common.delivery")}</Th>
                  <Th align="end" width="sm">
                    {t("common.total")}
                  </Th>
                  <Th width="lg">{t("common.createdAt")}</Th>
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: String(order.id) }}
                          className="font-medium text-primary-strong underline-offset-4 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </Td>
                      <Td>{order.customerName ?? "—"}</Td>
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
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={orders.data.page}
              totalPages={orders.data.totalPages}
              totalCount={orders.data.totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
