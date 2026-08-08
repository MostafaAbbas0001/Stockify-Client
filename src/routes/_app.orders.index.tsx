import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { RequirePermission } from "@/components/common/RequirePermission";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { TAB } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { ordersApi } from "@/lib/api/endpoints";
import { OrderStatus, orderStatusMeta } from "@/lib/enums";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/orders/")({
  head: () => ({
    meta: [
      { title: "Orders — Stockify" },
      {
        name: "description",
        content:
          "Track Stockify orders from creation to delivery: filter by status, branch and delivery location.",
      },
      { property: "og:title", content: "Orders — Stockify" },
      {
        property: "og:description",
        content: "The Stockify order and delivery work queue for every branch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersRoute,
});

const STATUS_OPTIONS = [
  OrderStatus.Draft,
  OrderStatus.InTransit,
  OrderStatus.Delivered,
  OrderStatus.PartiallyPaid,
  OrderStatus.FullyPaid,
  OrderStatus.Cancelled,
];

function OrdersRoute() {
  return (
    <RequirePermission permission={TAB.orders}>
      <OrdersList />
    </RequirePermission>
  );
}

function OrdersList() {
  const { t, locale } = useI18n();
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
      <div>
        <h1 className="text-lg font-semibold text-foreground">{t("orders.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("orders.subtitle")}</p>
      </div>

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
                placeholder={t("orders.searchPlaceholder")}
                className="min-w-64 flex-1"
              />
              <select
                value={statusId ?? ""}
                onChange={(event) => {
                  setStatusId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                aria-label={t("orders.statusFilter")}
              >
                <option value="">{t("common.all")}</option>
                {STATUS_OPTIONS.map((id) => {
                  const status = orderStatusMeta({ statusId: id });
                  return (
                    <option key={id} value={id}>
                      {status.meta ? t(status.meta.key) : String(id)}
                    </option>
                  );
                })}
              </select>
              <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={deliveryOnly}
                  onChange={(event) => {
                    setDeliveryOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="size-4 accent-[var(--primary)]"
                />
                {t("orders.deliveryOnly")}
              </label>
            </div>
          }
        />

        {orders.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : orders.isError ? (
          <div className="p-6">
            <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
          </div>
        ) : orders.data.items.length === 0 ? (
          <div className="p-6">
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
                  <Th>{t("orders.orderNumber")}</Th>
                  <Th>{t("common.customer")}</Th>
                  <Th>{t("common.status")}</Th>
                  <Th>{t("common.delivery")}</Th>
                  <Th align="end">{t("common.total")}</Th>
                  <Th>{t("common.createdAt")}</Th>
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((order) => {
                  const status = orderStatusMeta({ statusName: order.statusName });
                  return (
                    <tr key={order.id} className="border-t border-border hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: String(order.id) }}
                          className="font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </Td>
                      <Td>{order.customerName ?? "—"}</Td>
                      <Td>
                        <StatusBadge tone={status.meta?.tone ?? "neutral"}>
                          {order.statusName ||
                            (status.meta ? t(status.meta.key) : t("common.unavailable"))}
                        </StatusBadge>
                      </Td>
                      <Td>{order.deliveryLocation ?? "—"}</Td>
                      <Td align="end" className="font-numeric tabular-nums">
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
