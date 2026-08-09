import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppSelect } from "@/components/common/AppSelect";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { branchesQuery, movementTypesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { stockMovementsApi } from "@/lib/api/endpoints";
import { movementTypeMeta } from "@/lib/enums";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Read-only stock movement ledger with type, branch and date filters. */
export function MovementsScreen() {
  const { t, locale } = useI18n();

  const [search, setSearch] = useState("");
  const [movementTypeId, setMovementTypeId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const branches = useQuery(branchesQuery());
  const types = useQuery(movementTypesQuery());

  const movements = useQuery({
    queryKey: ["stock-movements", { search, movementTypeId, branchId, startDate, endDate, page }],
    queryFn: () =>
      stockMovementsApi.list({
        search: search || undefined,
        movementTypeId: movementTypeId ?? undefined,
        branchId: branchId ?? undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  const filtered = Boolean(search || movementTypeId || branchId || startDate || endDate);

  return (
    <div className="space-y-6">
      <PageHeader title={t("movements.title")} description={t("movements.subtitle")} />

      <Card>
        <CardHeader
          title={t("movements.title")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("movements.searchMovements")}
                className="min-w-56 flex-1"
              />
              <AppSelect
                value={movementTypeId ?? ""}
                onChange={(event) => {
                  setMovementTypeId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("movements.type")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              >
                <option value="">{t("movements.type")}</option>
                {(types.data ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </AppSelect>
              <AppSelect
                value={branchId ?? ""}
                onChange={(event) => {
                  setBranchId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("stock.branch")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              >
                <option value="">{t("common.all")}</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </AppSelect>
              <input
                type="date"
                value={startDate}
                aria-label={t("stock.from")}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              />
              <input
                type="date"
                value={endDate}
                aria-label={t("stock.to")}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              />
            </div>
          }
        />

        {movements.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : movements.isError ? (
          <div className="p-6">
            <ErrorState error={movements.error} onRetry={() => void movements.refetch()} />
          </div>
        ) : movements.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={filtered} title={t("movements.noMovements")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.date")}</Th>
                  <Th>{t("products.sku")}</Th>
                  <Th>{t("movements.type")}</Th>
                  <Th>{t("stock.branch")}</Th>
                  <Th>{t("stock.lotNumber")}</Th>
                  <Th>{t("stock.expiryDate")}</Th>
                  <Th align="end">{t("movements.quantity")}</Th>
                  <Th>{t("stock.reason")}</Th>
                </tr>
              </thead>
              <tbody>
                {movements.data.items.map((row, index) => {
                  const typeId = (types.data ?? []).find(
                    (type) => type.name === row.movementType,
                  )?.id;
                  const meta = typeId ? movementTypeMeta(typeId) : undefined;
                  return (
                    <tr key={`${row.createdAt}-${row.sku}-${index}`} className="hover:bg-muted/50">
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(row.createdAt, locale)}
                      </Td>
                      <Td>
                        <span className="block font-medium">{row.productName ?? "—"}</span>
                        <span className="font-numeric block text-xs text-muted-foreground">
                          {row.sku ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        {meta ? (
                          <StatusBadge tone={meta.tone}>{t(meta.key)}</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">{row.movementType ?? "—"}</StatusBadge>
                        )}
                      </Td>
                      <Td>{row.branchName ?? "—"}</Td>
                      <Td className="font-numeric">{row.lotNumber ?? "—"}</Td>
                      <Td className="text-muted-foreground">
                        {row.expiryDate ? formatDate(row.expiryDate, locale) : "—"}
                      </Td>
                      <Td align="end">
                        <span
                          className={cn(
                            "font-numeric font-semibold",
                            row.quantity < 0 ? "text-destructive" : "text-success",
                          )}
                        >
                          {row.quantity > 0 ? "+" : ""}
                          {formatNumber(row.quantity, locale)}
                        </span>
                      </Td>
                      <Td className="max-w-56 truncate text-muted-foreground">
                        {row.reason ?? "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={movements.data.page}
              totalPages={movements.data.totalPages}
              totalCount={movements.data.totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
