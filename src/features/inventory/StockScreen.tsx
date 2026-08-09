import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/common/AppSelect";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { AdjustmentFormDialog } from "@/features/inventory/AdjustmentFormDialog";
import { LotFormDialog } from "@/features/inventory/LotFormDialog";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { adjustmentsApi, inventoryLotsApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { AdjustmentRow } from "@/lib/api/types";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "lots" | "adjustments";

/** Inventory lots with branch balances, plus the manual adjustment audit trail. */
export function StockScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>("lots");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("stock.title")}
        description={t("stock.subtitle")}
        actions={
          <div className="flex shrink-0 gap-2">
            {tab === "lots" && can(PERM.stockRestock) && <NewLotButton />}
            {tab === "adjustments" && can(PERM.stockReduce) && <NewAdjustmentButton />}
          </div>
        }
      />

      <div className="inline-flex w-full rounded-xl border border-border bg-surface-sunken p-1 sm:w-auto">
        {(["lots", "adjustments"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            className={cn(
              "h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition sm:flex-none",
              tab === option
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(option === "lots" ? "stock.lots" : "stock.adjustments")}
          </button>
        ))}
      </div>

      {tab === "lots" ? <LotsPanel locale={locale} /> : <AdjustmentsPanel locale={locale} />}
    </div>
  );
}

function NewLotButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/15 transition hover:bg-primary/90"
      >
        <Plus className="size-4" />
        {t("stock.newLot")}
      </button>
      {open && <LotFormDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

function NewAdjustmentButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/15 transition hover:bg-primary/90"
      >
        <Plus className="size-4" />
        {t("stock.newAdjustment")}
      </button>
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
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("stock.searchLots")}
              className="min-w-56 flex-1"
            />
            <AppSelect
              value={branchId ?? ""}
              onChange={(event) => {
                setBranchId(event.target.value ? Number(event.target.value) : null);
                setPage(1);
              }}
              aria-label={t("stock.branch")}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            >
              <option value="">{t("common.all")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AppSelect>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={includeEmpty}
                onChange={(event) => {
                  setIncludeEmpty(event.target.checked);
                  setPage(1);
                }}
                className="size-3.5 accent-[var(--primary)]"
              />
              {t("stock.includeEmpty")}
            </label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={includeExpired}
                onChange={(event) => {
                  setIncludeExpired(event.target.checked);
                  setPage(1);
                }}
                className="size-3.5 accent-[var(--primary)]"
              />
              {t("stock.includeExpired")}
            </label>
          </div>
        }
      />

      {lots.isPending ? (
        <div className="p-6">
          <LoadingState />
        </div>
      ) : lots.isError ? (
        <div className="p-6">
          <ErrorState error={lots.error} onRetry={() => void lots.refetch()} />
        </div>
      ) : lots.data.items.length === 0 ? (
        <div className="p-6">
          <EmptyState filtered={Boolean(search || branchId)} title={t("stock.noLots")} />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>{t("products.sku")}</Th>
                <Th>{t("stock.lotNumber")}</Th>
                <Th>{t("stock.expiryDate")}</Th>
                <Th>{t("stock.receivedAt")}</Th>
                <Th>{t("stock.branches")}</Th>
                <Th align="end">{t("stock.totalQuantity")}</Th>
              </tr>
            </thead>
            <tbody>
              {lots.data.items.map((lot) => {
                const expired = lot.expiryDate ? Date.parse(lot.expiryDate) < now : false;
                return (
                  <tr key={lot.id} className="hover:bg-muted/50">
                    <Td>
                      <span className="block font-medium">{lot.productName ?? "—"}</span>
                      <span className="font-numeric block text-xs text-muted-foreground">
                        {lot.sku ?? "—"}
                      </span>
                    </Td>
                    <Td className="font-numeric">{lot.lotNumber}</Td>
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
                                className="rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[0.7rem] text-foreground"
                              >
                                {branch.branchName}:{" "}
                                <span className="font-numeric font-semibold">
                                  {formatNumber(branch.quantity, locale)}
                                </span>
                              </span>
                            ))}
                      </div>
                    </Td>
                    <Td align="end" className="font-numeric font-semibold">
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
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("stock.searchAdjustments")}
              className="min-w-56 flex-1"
            />
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
          </div>
        }
      />

      {adjustments.isPending ? (
        <div className="p-6">
          <LoadingState />
        </div>
      ) : adjustments.isError ? (
        <div className="p-6">
          <ErrorState error={adjustments.error} onRetry={() => void adjustments.refetch()} />
        </div>
      ) : adjustments.data.items.length === 0 ? (
        <div className="p-6">
          <EmptyState filtered={Boolean(search || branchId)} title={t("stock.noAdjustments")} />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>{t("common.createdAt")}</Th>
                <Th>{t("products.sku")}</Th>
                <Th>{t("stock.branch")}</Th>
                <Th>{t("stock.lotNumber")}</Th>
                <Th align="end">{t("stock.change")}</Th>
                <Th align="end">{t("stock.quantityAfter")}</Th>
                <Th>{t("stock.reason")}</Th>
                <Th align="end">{t("common.actions")}</Th>
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
                    <span className="font-numeric block text-xs text-muted-foreground">
                      {row.sku ?? "—"}
                    </span>
                  </Td>
                  <Td>{row.branchName ?? "—"}</Td>
                  <Td className="font-numeric">{row.lotNumber ?? "—"}</Td>
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
                  <Td align="end" className="font-numeric">
                    {formatNumber(row.quantityAfter, locale)}
                  </Td>
                  <Td className="max-w-56 truncate text-muted-foreground">{row.reason ?? "—"}</Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-1">
                      {can(PERM.stockReduce) && (
                        <>
                          <button
                            type="button"
                            aria-label={t("common.edit")}
                            onClick={() => setEditing(row)}
                            className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={t("stock.reverse")}
                            onClick={() => {
                              setReverseError(null);
                              setReversing(row);
                            }}
                            className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Undo2 className="size-3.5" />
                          </button>
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
