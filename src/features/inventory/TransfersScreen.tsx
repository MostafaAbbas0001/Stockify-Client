import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Send, PackageCheck, Ban, ShieldCheck } from "lucide-react";
import { Fragment, useState } from "react";
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
import { TransferDispatchDialog } from "@/features/inventory/TransferDispatchDialog";
import { TransferFormDialog } from "@/features/inventory/TransferFormDialog";
import { TransferReceiveDialog } from "@/features/inventory/TransferReceiveDialog";
import {
  transferCreatedBy,
  transferStatusId,
  transferStatusName,
} from "@/features/inventory/transferStatus";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { stockTransfersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { TransferStatus, transferStatusMeta } from "@/lib/enums";
import type { TransferRow } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Branch-to-branch transfers with the full draft → dispatch → receipt flow. */
export function TransfersScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [statusId, setStatusId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [dispatching, setDispatching] = useState<TransferRow | null>(null);
  const [receiving, setReceiving] = useState<TransferRow | null>(null);
  const [cancelling, setCancelling] = useState<TransferRow | null>(null);
  const [resolving, setResolving] = useState<TransferRow | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const branches = useQuery(branchesQuery());
  const stats = useQuery({
    queryKey: ["stock-transfers", "statistics", branchId],
    queryFn: () => stockTransfersApi.statistics({ branchId: branchId ?? undefined }),
  });
  const transfers = useQuery({
    queryKey: ["stock-transfers", { search, branchId, statusId, page }],
    queryFn: () =>
      stockTransfersApi.list({
        search: search || undefined,
        branchId: branchId ?? undefined,
        statusId: statusId ?? undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
    void queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
  };

  const cancel = useMutation({
    mutationFn: (transfer: TransferRow) => stockTransfersApi.cancel(transfer.id),
    onSuccess: () => {
      toast.success(t("transfers.cancelled"));
      invalidate();
      setCancelling(null);
      setActionError(null);
    },
    onError: (error) =>
      setActionError(isApiError(error) ? error.message : (error as Error).message),
  });

  const resolve = useMutation({
    mutationFn: (transfer: TransferRow) =>
      stockTransfersApi.resolveDiscrepancy(transfer.id, resolveNote.trim()),
    onSuccess: () => {
      toast.success(t("transfers.resolved"));
      invalidate();
      setResolving(null);
      setResolveNote("");
      setActionError(null);
    },
    onError: (error) =>
      setActionError(isApiError(error) ? error.message : (error as Error).message),
  });

  const filtered = Boolean(search || branchId || statusId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transfers.title")}
        description={t("transfers.subtitle")}
        actions={
          can(PERM.transferRequest) && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {t("transfers.newTransfer")}
            </button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("transfers.total")}
          value={formatNumber(stats.data?.totalTransfers ?? 0, locale)}
        />
        <StatCard
          label={t("transfers.lastMonth")}
          value={formatNumber(stats.data?.thisMonthTransfers ?? 0, locale)}
        />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("transfers.byStatus")}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(stats.data?.byStatus ?? []).length === 0
              ? "—"
              : (stats.data?.byStatus ?? []).map((entry) => (
                  <span
                    key={entry.status}
                    className="rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[0.7rem] text-foreground"
                  >
                    {entry.status}:{" "}
                    <span className="font-numeric font-semibold">
                      {formatNumber(entry.count, locale)}
                    </span>
                  </span>
                ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title={t("transfers.title")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("transfers.searchTransfers")}
                className="min-w-56 flex-1"
              />
              <AppSelect
                value={statusId ?? ""}
                onChange={(event) => {
                  setStatusId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("common.status")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              >
                <option value="">{t("common.all")}</option>
                {Object.values(TransferStatus).map((id) => (
                  <option key={id} value={id}>
                    {t(transferStatusMeta(id)?.key ?? "")}
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
            </div>
          }
        />

        {transfers.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : transfers.isError ? (
          <div className="p-6">
            <ErrorState error={transfers.error} onRetry={() => void transfers.refetch()} />
          </div>
        ) : transfers.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={filtered} title={t("transfers.noTransfers")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.createdAt")}</Th>
                  <Th>{t("transfers.route")}</Th>
                  <Th>{t("common.status")}</Th>
                  <Th>{t("transfers.createdBy")}</Th>
                  <Th align="end">{t("transfers.items")}</Th>
                  <Th align="end">{t("common.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {transfers.data.items.map((transfer) => {
                  const id = transferStatusId(transfer);
                  const meta = id ? transferStatusMeta(id) : undefined;
                  const isOpen = expanded === transfer.id;
                  const canDispatch = id === TransferStatus.Draft && can(PERM.transferSend);
                  const canReceive =
                    (id === TransferStatus.Sent || id === TransferStatus.PartiallyReceived) &&
                    can(PERM.transferReceive);
                  const canCancel =
                    id !== TransferStatus.Completed &&
                    id !== TransferStatus.Cancelled &&
                    can(PERM.transferCancel);
                  const canResolve =
                    transfer.hasDiscrepancy && !transfer.isResolved && can(PERM.transferResolve);

                  return (
                    <Fragment key={transfer.id}>
                      <tr className="hover:bg-muted/50">
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(transfer.createdAt, locale)}
                        </Td>
                        <Td>
                          <span className="block font-medium">
                            {transfer.sourceBranch ?? t("transfers.sourceLater")} →{" "}
                            {transfer.destinationBranch ?? "—"}
                          </span>
                          {transfer.notes && (
                            <span className="block max-w-64 truncate text-xs text-muted-foreground">
                              {transfer.notes}
                            </span>
                          )}
                        </Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-1">
                            {meta ? (
                              <StatusBadge tone={meta.tone}>{t(meta.key)}</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">
                                {transferStatusName(transfer) || "—"}
                              </StatusBadge>
                            )}
                            {transfer.hasDiscrepancy && !transfer.isResolved && (
                              <StatusBadge tone="warning">
                                {t("transfers.discrepancyOpen")}
                              </StatusBadge>
                            )}
                          </div>
                        </Td>
                        <Td className="text-muted-foreground">{transferCreatedBy(transfer)}</Td>
                        <Td align="end" className="font-numeric">
                          {formatNumber(
                            transfer.itemCount ?? (transfer.items ?? []).length,
                            locale,
                          )}
                        </Td>
                        <Td align="end">
                          <div className="flex items-center justify-end gap-1">
                            {canDispatch && (
                              <IconAction
                                label={t("transfers.dispatch")}
                                onClick={() => setDispatching(transfer)}
                                icon={<Send className="size-3.5" />}
                              />
                            )}
                            {canReceive && (
                              <IconAction
                                label={t("transfers.receive")}
                                onClick={() => setReceiving(transfer)}
                                icon={<PackageCheck className="size-3.5" />}
                              />
                            )}
                            {canResolve && (
                              <IconAction
                                label={t("transfers.resolveTitle")}
                                onClick={() => {
                                  setActionError(null);
                                  setResolveNote("");
                                  setResolving(transfer);
                                }}
                                icon={<ShieldCheck className="size-3.5" />}
                              />
                            )}
                            {canCancel && (
                              <IconAction
                                label={t("transfers.cancel")}
                                danger
                                onClick={() => {
                                  setActionError(null);
                                  setCancelling(transfer);
                                }}
                                icon={<Ban className="size-3.5" />}
                              />
                            )}
                            <IconAction
                              label={t("common.details")}
                              onClick={() => setExpanded(isOpen ? null : transfer.id)}
                              icon={
                                <ChevronDown
                                  className={cn("size-3.5 transition", isOpen && "rotate-180")}
                                />
                              }
                            />
                          </div>
                        </Td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-surface-sunken">
                          <td colSpan={6} className="px-4 py-3">
                            <TransferItems transfer={transfer} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={transfers.data.page}
              totalPages={transfers.data.totalPages}
              totalCount={transfers.data.totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {creating && <TransferFormDialog open onOpenChange={(open) => !open && setCreating(false)} />}
      {dispatching && (
        <TransferDispatchDialog
          key={`dispatch-${dispatching.id}`}
          transfer={dispatching}
          onClose={() => setDispatching(null)}
        />
      )}
      {receiving && (
        <TransferReceiveDialog
          key={`receive-${receiving.id}`}
          transfer={receiving}
          onClose={() => setReceiving(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={t("transfers.cancelTitle")}
        body={t("transfers.cancelBody")}
        confirmLabel={t("transfers.cancel")}
        tone="destructive"
        pending={cancel.isPending}
        error={actionError}
        onCancel={() => {
          setCancelling(null);
          setActionError(null);
        }}
        onConfirm={() => {
          if (cancelling) cancel.mutate(cancelling);
        }}
      />

      {resolving && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (resolveNote.trim().length < 3) {
                setActionError(t("transfers.resolveHint"));
                return;
              }
              resolve.mutate(resolving);
            }}
            className="w-full max-w-md space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-foreground">{t("transfers.resolveTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("transfers.resolveHint")}</p>
            {actionError && (
              <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
                {actionError}
              </p>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">
                {t("transfers.resolveNote")}
              </span>
              <textarea
                value={resolveNote}
                onChange={(event) => setResolveNote(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setResolving(null);
                  setActionError(null);
                }}
                className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={resolve.isPending}
                className="h-10 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-numeric mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function IconAction({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center text-muted-foreground transition-colors",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

function TransferItems({ transfer }: { transfer: TransferRow }) {
  const { t, locale } = useI18n();
  const detail = useQuery({
    queryKey: ["stock-transfers", "detail", transfer.id],
    queryFn: () => stockTransfersApi.get(transfer.id),
    enabled: (transfer.items ?? []).length === 0,
  });
  const row = (transfer.items ?? []).length > 0 ? transfer : detail.data;
  const items = row?.items ?? [];

  if (!row) return <LoadingState />;
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("common.noRecords")}</p>;
  }

  return (
    <div className="space-y-2">
      {row.resolutionNote && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          {t("transfers.resolveNote")}: {row.resolutionNote}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.productName ?? "—"}
                </p>
                <p className="font-numeric truncate text-xs text-muted-foreground">
                  {item.sku ?? item.variantSKU ?? "—"}
                </p>
              </div>
              <p className="font-numeric text-xs text-muted-foreground">
                {t("transfers.requested")}: {formatNumber(item.quantityRequested, locale)} ·{" "}
                {t("transfers.sent")}: {formatNumber(item.quantitySent, locale)} ·{" "}
                {t("transfers.received")}: {formatNumber(item.quantityReceived, locale)}
              </p>
            </div>
            {(item.lots ?? []).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(item.lots ?? []).map((lot) => (
                  <span
                    key={lot.inventoryLotId}
                    className="rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[0.7rem] text-foreground"
                  >
                    {lot.lotNumber ?? `#${lot.inventoryLotId}`}:{" "}
                    <span className="font-numeric">
                      {formatNumber(lot.quantityReceived, locale)}/
                      {formatNumber(lot.quantitySent, locale)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
