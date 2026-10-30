import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { AdjustmentFormDialog } from "@/features/inventory/stock/components/AdjustmentFormDialog";
import { LotFormDialog } from "@/features/inventory/stock/components/LotFormDialog";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { adjustmentsApi, inventoryLotsApi } from "@/features/inventory/stock/api";
import { isApiError } from "@/shared/api/errors";
import type { AdjustmentRow } from "@/features/inventory/stock/types";
import { formatDate, formatDateTime, formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

type Tab = "lots" | "adjustments";

/** Inventory lots with branch balances, plus the manual adjustment audit trail. */
export function StockScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>("lots");

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("stock.title")}
        description={t("stock.subtitle")}
        actions={
          <>
            {tab === "lots" && can(PERM.stockRestock) && <NewLotButton />}
            {tab === "adjustments" && can(PERM.stockReduce) && <NewAdjustmentButton />}
          </>
        }
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        label={t("stock.title")}
        options={[
          { value: "lots", label: t("stock.lots") },
          { value: "adjustments", label: t("stock.adjustments") },
        ]}
      />

      {tab === "lots" ? <LotsPanel locale={locale} /> : <AdjustmentsPanel locale={locale} />}
    </div>
  );
}

function NewLotButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("stock.newLot")}
      </Button>
      {open && <LotFormDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

function NewAdjustmentButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("stock.newAdjustment")}
      </Button>
      {open && (
        <AdjustmentFormDialog key="new" open={open} onOpenChange={setOpen} adjustment={null} />
      )}
    </>
  );
}

function LotsPanel({ locale }: { locale: "en" | "ar" }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(true);
  const [page, setPage] = useState(1);

  const branches = useQuery(branchesQuery());
  const lots = useQuery({
    queryKey: ["inventory-lots", { search, branchId, includeEmpty, includeExpired, page }],
    queryFn: () =>
      inventoryLotsApi.list({
        search: search || undefined,
        branchId: branchId ?? undefined,
        includeEmpty,
        includeExpired,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  const now = Date.now();

  return (
    <Card>
      <CardHeader
        title={t("stock.lots")}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
            <SearchInput
              className="col-span-2 md:w-64"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("stock.searchLots")}
            />
            <AppSelect
              value={branchId ?? ""}
              onChange={(event) => {
                setBranchId(event.target.value ? Number(event.target.value) : null);
                setPage(1);
              }}
              aria-label={t("stock.branch")}
              className="col-span-2 w-full md:col-span-1 md:w-44"
            >
              <option value="">{t("common.all")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AppSelect>
            <label className="col-span-2 flex h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-control bg-muted px-3.5 text-[13px] font-medium text-foreground md:col-span-1 md:h-9">
              <input
                type="checkbox"
                checked={includeEmpty}
                onChange={(event) => {
                  setIncludeEmpty(event.target.checked);
                  setPage(1);
                }}
                className="size-4"
              />
              {t("stock.includeEmpty")}
            </label>
            <label className="col-span-2 flex h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-control bg-muted px-3.5 text-[13px] font-medium text-foreground md:col-span-1 md:h-9">
              <input
                type="checkbox"
                checked={includeExpired}
                onChange={(event) => {
                  setIncludeExpired(event.target.checked);
                  setPage(1);
                }}
                className="size-4"
              />
              {t("stock.includeExpired")}
            </label>
          </div>
        }
      />

      {lots.isPending ? (
        <div>
          <LoadingState />
        </div>
      ) : lots.isError ? (
        <div>
          <ErrorState error={lots.error} onRetry={() => void lots.refetch()} />
        </div>
      ) : lots.data.items.length === 0 ? (
        <div>
          <EmptyState filtered={Boolean(search || branchId)} title={t("stock.noLots")} />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>{t("products.sku")}</Th>
                <Th width="sm">{t("stock.lotNumber")}</Th>
                <Th width="md">{t("stock.expiryDate")}</Th>
                <Th width="sm">{t("stock.receivedAt")}</Th>
                <Th>{t("stock.branches")}</Th>
                <Th align="end" width="xs">
                  {t("stock.totalQuantity")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {lots.data.items.map((lot) => {
                const expired = lot.expiryDate ? Date.parse(lot.expiryDate) < now : false;
                return (
                  <tr key={lot.id} className="hover:bg-muted/50">
                    <Td>
                      <span className="block font-medium">{lot.productName ?? "—"}</span>
                      <span className="tabular-nums block text-xs text-muted-foreground">
                        {lot.sku ?? "—"}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{lot.lotNumber}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span>{lot.expiryDate ? formatDate(lot.expiryDate, locale) : "—"}</span>
                        {expired && <StatusBadge tone="error">{t("stock.expired")}</StatusBadge>}
                      </div>
                    </Td>
                    <Td className="text-muted-foreground">{formatDate(lot.receivedAt, locale)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(lot.branches ?? []).length === 0
                          ? "—"
                          : (lot.branches ?? []).map((branch) => (
                              <span
                                key={branch.branchId}
                                className="inline-flex h-6 items-center gap-1 rounded-control bg-muted px-2 text-xs text-foreground"
                              >
                                {branch.branchName}
                                <span className="font-semibold tabular-nums">
                                  {formatNumber(branch.quantity, locale)}
                                </span>
                              </span>
                            ))}
                      </div>
                    </Td>
                    <Td align="end" className="tabular-nums font-semibold">
                      {formatNumber(lot.totalQuantity, locale)}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <Pagination
            page={lots.data.page}
            totalPages={lots.data.totalPages}
            totalCount={lots.data.totalCount}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}

function AdjustmentsPanel({ locale }: { locale: "en" | "ar" }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdjustmentRow | null>(null);
  const [reversing, setReversing] = useState<AdjustmentRow | null>(null);
  const [reverseError, setReverseError] = useState<string | null>(null);

  const branches = useQuery(branchesQuery());
  const adjustments = useQuery({
    queryKey: ["inventory-adjustments", { search, branchId, page }],
    queryFn: () =>
      adjustmentsApi.list({
        search: search || undefined,
        branchId: branchId ?? undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  const reverse = useMutation({
    mutationFn: (id: number) => adjustmentsApi.remove(id),
    onSuccess: () => {
      toast.success(t("stock.adjustmentReversed"));
      void queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      setReversing(null);
      setReverseError(null);
    },
    onError: (error) =>
      setReverseError(isApiError(error) ? error.message : (error as Error).message),
  });

  return (
    <Card>
      <CardHeader
        title={t("stock.adjustments")}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
            <SearchInput
              className="col-span-2 md:w-64"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("stock.searchAdjustments")}
            />
            <AppSelect
              value={branchId ?? ""}
              onChange={(event) => {
                setBranchId(event.target.value ? Number(event.target.value) : null);
                setPage(1);
              }}
              aria-label={t("stock.branch")}
              className="col-span-2 w-full md:col-span-1 md:w-44"
            >
              <option value="">{t("common.all")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AppSelect>
          </div>
        }
      />

      {adjustments.isPending ? (
        <div>
          <LoadingState />
        </div>
      ) : adjustments.isError ? (
        <div>
          <ErrorState error={adjustments.error} onRetry={() => void adjustments.refetch()} />
        </div>
      ) : adjustments.data.items.length === 0 ? (
        <div>
          <EmptyState filtered={Boolean(search || branchId)} title={t("stock.noAdjustments")} />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th width="lg">{t("common.createdAt")}</Th>
                <Th>{t("products.sku")}</Th>
                <Th width="md">{t("stock.branch")}</Th>
                <Th width="sm">{t("stock.lotNumber")}</Th>
                <Th align="end" width="xs">
                  {t("stock.change")}
                </Th>
                <Th align="end" width="xs">
                  {t("stock.quantityAfter")}
                </Th>
                <Th>{t("stock.reason")}</Th>
                <Th align="end" actions>
                  {t("common.actions")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {adjustments.data.items.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(row.createdAt, locale)}
                  </Td>
                  <Td>
                    <span className="block font-medium">{row.productName ?? "—"}</span>
                    <span className="tabular-nums block text-xs text-muted-foreground">
                      {row.sku ?? "—"}
                    </span>
                  </Td>
                  <Td>{row.branchName ?? "—"}</Td>
                  <Td className="tabular-nums">{row.lotNumber ?? "—"}</Td>
                  <Td align="end">
                    <span className="font-semibold tabular-nums text-foreground">
                      {row.quantity > 0 ? "+" : ""}
                      {formatNumber(row.quantity, locale)}
                    </span>
                  </Td>
                  <Td align="end" className="tabular-nums">
                    {formatNumber(row.quantityAfter, locale)}
                  </Td>
                  <Td className="max-w-56 truncate text-muted-foreground">{row.reason ?? "—"}</Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-1">
                      {can(PERM.stockReduce) && (
                        <>
                          <Button
                            type="button"
                            aria-label={t("common.edit")}
                            onClick={() => setEditing(row)}
                            variant="quiet"
                            size="icon-sm"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            aria-label={t("stock.reverse")}
                            onClick={() => {
                              setReverseError(null);
                              setReversing(row);
                            }}
                            variant="quiet-destructive"
                            size="icon-sm"
                          >
                            <Undo2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={adjustments.data.page}
            totalPages={adjustments.data.totalPages}
            totalCount={adjustments.data.totalCount}
            onPageChange={setPage}
          />
        </>
      )}

      {editing && (
        <AdjustmentFormDialog
          key={editing.id}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          adjustment={editing}
        />
      )}

      <ConfirmDialog
        open={Boolean(reversing)}
        title={t("stock.reverseTitle")}
        body={t("stock.reverseBody")}
        confirmLabel={t("stock.reverse")}
        tone="destructive"
        pending={reverse.isPending}
        error={reverseError}
        onCancel={() => {
          setReversing(null);
          setReverseError(null);
        }}
        onConfirm={() => {
          if (reversing) reverse.mutate(reversing.id);
        }}
      />
    </Card>
  );
}
