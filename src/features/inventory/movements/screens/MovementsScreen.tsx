import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppSelect } from "@/shared/components/AppSelect";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { LookupBadge } from "@/features/lookups/LookupBadge";
import { useLookups } from "@/features/lookups/useLookups";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { stockMovementsApi } from "@/features/inventory/movements/api";
import { formatDate, formatDateTime, formatNumber } from "@/shared/lib/format";
import { Input } from "@/shared/ui/input";

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
  const lookups = useLookups();

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
    <div className="space-y-4">
      <PageHeader title={t("movements.title")} description={t("movements.subtitle")} />

      <Card>
        <CardHeader
          title={t("movements.title")}
          actions={
            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
              <SearchInput
                className="col-span-2 md:w-64"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("movements.searchMovements")}
              />
              <AppSelect
                value={movementTypeId ?? ""}
                onChange={(event) => {
                  setMovementTypeId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("movements.type")}
                className="w-full md:w-44"
              >
                <option value="">{t("movements.type")}</option>
                {lookups.list("movementTypes").map((type) => (
                  <option key={type.id} value={type.id}>
                    {lookups.label("movementTypes", type)}
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
                className="w-full md:w-44"
              >
                <option value="">{t("common.all")}</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </AppSelect>
              <Input
                type="date"
                value={startDate}
                aria-label={t("stock.from")}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                className="md:w-40"
              />
              <Input
                type="date"
                value={endDate}
                aria-label={t("stock.to")}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                className="md:w-40"
              />
            </div>
          }
        />

        {movements.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : movements.isError ? (
          <div>
            <ErrorState error={movements.error} onRetry={() => void movements.refetch()} />
          </div>
        ) : movements.data.items.length === 0 ? (
          <div>
            <EmptyState filtered={filtered} title={t("movements.noMovements")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th width="lg">{t("common.date")}</Th>
                  <Th>{t("products.sku")}</Th>
                  <Th width="md">{t("movements.type")}</Th>
                  <Th width="md">{t("stock.branch")}</Th>
                  <Th width="sm">{t("stock.lotNumber")}</Th>
                  <Th width="sm">{t("stock.expiryDate")}</Th>
                  <Th align="end" width="xs">
                    {t("movements.quantity")}
                  </Th>
                  <Th>{t("stock.reason")}</Th>
                </tr>
              </thead>
              <tbody>
                {movements.data.items.map((row, index) => {
                  return (
                    <tr key={`${row.createdAt}-${row.sku}-${index}`} className="hover:bg-muted/50">
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(row.createdAt, locale)}
                      </Td>
                      <Td>
                        <span className="block font-medium">{row.productName ?? "—"}</span>
                        <span className="tabular-nums block text-xs text-muted-foreground">
                          {row.sku ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <LookupBadge
                          list="movementTypes"
                          code={row.movementTypeCode}
                          fallback={row.movementType}
                        />
                      </Td>
                      <Td>{row.branchName ?? "—"}</Td>
                      <Td className="tabular-nums">{row.lotNumber ?? "—"}</Td>
                      <Td className="text-muted-foreground">
                        {row.expiryDate ? formatDate(row.expiryDate, locale) : "—"}
                      </Td>
                      <Td align="end">
                        <span className="font-semibold tabular-nums text-foreground">
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
