import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Ban, ChevronDown, PackageCheck, Plus, Send, ShieldCheck } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { FormDialog } from "@/shared/components/FormDialog";
import {
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  StatStrip,
  TableShell,
  Td,
  Th,
} from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { TransferDispatchDialog } from "@/features/inventory/transfers/components/TransferDispatchDialog";
import { TransferFormDialog } from "@/features/inventory/transfers/components/TransferFormDialog";
import { TransferReceiveDialog } from "@/features/inventory/transfers/components/TransferReceiveDialog";
import { TransferStatusCode } from "@/features/lookups/codes";
import { LookupBadge } from "@/features/lookups/LookupBadge";
import { useLookups } from "@/features/lookups/useLookups";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { stockTransfersApi } from "@/features/inventory/transfers/api";
import { isApiError } from "@/shared/api/errors";
import type { TransferRow } from "@/features/inventory/transfers/types";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/input";
import { Field, FormError } from "@/shared/ui/field";

/** Branch-to-branch transfers with the full draft → dispatch → receipt flow. */
export function TransfersScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const lookups = useLookups();

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
    <div className="space-y-4">
      <PageHeader
        title={t("transfers.title")}
        description={t("transfers.subtitle")}
        actions={
          can(PERM.transferRequest) && (
            <Button type="button" onClick={() => setCreating(true)} className="shrink-0">
              <Plus className="size-4" />
              {t("transfers.newTransfer")}
            </Button>
          )
        }
      />

      <StatStrip className="lg:grid-cols-[1fr_1fr_2fr]">
        <StatCard
          label={t("transfers.total")}
          value={formatNumber(stats.data?.totalTransfers ?? 0, locale)}
        />
        <StatCard
          label={t("transfers.lastMonth")}
          value={formatNumber(stats.data?.thisMonthTransfers ?? 0, locale)}
        />
        <div className="col-span-2 min-w-0 border-s border-border ps-4 sm:ps-5 lg:col-span-1">
          <p className="text-caption font-medium uppercase tracking-[0.05em] text-muted-foreground">
            {t("transfers.byStatus")}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(stats.data?.byStatus ?? []).length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              (stats.data?.byStatus ?? []).map((entry) => (
                <span
                  key={entry.statusCode}
                  className="inline-flex h-7 items-center gap-1.5 rounded-control border border-border bg-card px-2.5 text-xs text-foreground"
                >
                  {lookups.labelOf("stockTransferStatuses", entry.statusCode, entry.status)}
                  <span className="font-semibold tabular-nums">
                    {formatNumber(entry.count, locale)}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>
      </StatStrip>

      <Card>
        <CardHeader
          title={t("transfers.title")}
          actions={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap md:w-auto">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("transfers.searchTransfers")}
                className="sm:w-64"
              />
              <AppSelect
                value={statusId ?? ""}
                onChange={(event) => {
                  setStatusId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("common.status")}
                className="w-full sm:w-44"
              >
                <option value="">{t("common.all")}</option>
                {lookups.list("stockTransferStatuses").map((status) => (
                  <option key={status.id} value={status.id}>
                    {lookups.label("stockTransferStatuses", status)}
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
                className="w-full sm:w-44"
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
          <div>
            <LoadingState />
          </div>
        ) : transfers.isError ? (
          <div>
            <ErrorState error={transfers.error} onRetry={() => void transfers.refetch()} />
          </div>
        ) : transfers.data.items.length === 0 ? (
          <div>
            <EmptyState filtered={filtered} title={t("transfers.noTransfers")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th width="lg">{t("common.createdAt")}</Th>
                  <Th>{t("transfers.route")}</Th>
                  <Th width="md">{t("common.status")}</Th>
                  <Th width="md">{t("transfers.createdBy")}</Th>
                  <Th align="end" width="xs">
                    {t("transfers.items")}
                  </Th>
                  <Th align="end" actions>
                    {t("common.actions")}
                  </Th>
                </tr>
              </thead>
              <tbody>
                {transfers.data.items.map((transfer) => {
                  const code = transfer.statusCode;
                  const isOpen = expanded === transfer.id;
                  const canDispatch = code === TransferStatusCode.Draft && can(PERM.transferSend);
                  const canReceive =
                    (code === TransferStatusCode.Sent ||
                      code === TransferStatusCode.PartiallyReceived) &&
                    can(PERM.transferReceive);
                  const canCancel =
                    code !== TransferStatusCode.Completed &&
                    code !== TransferStatusCode.Cancelled &&
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
                          <span className="flex items-center gap-1.5 font-medium">
                            {transfer.sourceBranch ?? t("transfers.sourceLater")}
                            <ArrowRight
                              className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180"
                              aria-label={t("transfers.route")}
                            />
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
                            <LookupBadge
                              list="stockTransferStatuses"
                              code={transfer.statusCode}
                              fallback={transfer.status}
                            />
                            {transfer.hasDiscrepancy && !transfer.isResolved && (
                              <StatusBadge tone="warning">
                                {t("transfers.discrepancyOpen")}
                              </StatusBadge>
                            )}
                          </div>
                        </Td>
                        <Td className="text-muted-foreground">{createdByName(transfer)}</Td>
                        <Td align="end" className="tabular-nums">
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
                        <tr className="bg-muted">
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

      <FormDialog
        open={Boolean(resolving)}
        onOpenChange={(open) => {
          if (open) return;
          setResolving(null);
          setActionError(null);
        }}
        pending={resolve.isPending}
        size="md"
        title={t("transfers.resolveTitle")}
        description={t("transfers.resolveHint")}
        onSubmit={(event) => {
          event.preventDefault();
          if (resolveNote.trim().length < 3) {
            setActionError(t("transfers.resolveHint"));
            return;
          }
          if (resolving) resolve.mutate(resolving);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setResolving(null);
                setActionError(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={resolve.isPending}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <FormError>{actionError}</FormError>
        <Field label={t("transfers.resolveNote")}>
          <Textarea
            value={resolveNote}
            onChange={(event) => setResolveNote(event.target.value)}
            rows={3}
          />
        </Field>
      </FormDialog>
    </div>
  );
}

/** The list returns the creator's username; the detail returns a user object. */
function createdByName(transfer: TransferRow): string {
  const raw = transfer.createdBy;
  if (typeof raw === "string") return raw;
  return raw?.username ?? "—";
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
    <Button
      variant={danger ? "quiet-destructive" : "quiet"}
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
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
        <p className="rounded-control border border-border bg-card px-3.5 py-2.5 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">{t("transfers.resolveNote")}:</span>{" "}
          {row.resolutionNote}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-control border border-border bg-card px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.productName ?? "—"}
                </p>
                <p className="tabular-nums truncate text-xs text-muted-foreground">
                  {item.sku ?? item.variantSKU ?? "—"}
                </p>
              </div>
              <dl className="flex gap-4 text-xs tabular-nums">
                {(
                  [
                    ["transfers.requested", item.quantityRequested],
                    ["transfers.sent", item.quantitySent],
                    ["transfers.received", item.quantityReceived],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{t(label)}</dt>
                    <dd className="font-medium text-foreground">{formatNumber(value, locale)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {(item.lots ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(item.lots ?? []).map((lot) => (
                  <span
                    key={lot.inventoryLotId}
                    className="inline-flex h-6 items-center rounded-control bg-muted px-2 text-xs text-foreground"
                  >
                    {lot.lotNumber ?? `#${lot.inventoryLotId}`}:{" "}
                    <span className="tabular-nums">
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
