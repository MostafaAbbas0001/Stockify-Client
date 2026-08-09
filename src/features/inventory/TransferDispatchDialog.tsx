import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/common/AppSelect";
import { LoadingState } from "@/components/common/DataStates";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { inventoryLotsApi, stockTransfersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { TransferRow } from "@/lib/api/types";
import { formatDate, formatNumber } from "@/lib/format";

type Allocation = Record<string, string>;

const key = (itemId: number, lotId: number) => `${itemId}:${lotId}`;

/**
 * Dispatches a draft transfer: allocates the actual lots leaving the source
 * branch. Sending less than requested is allowed, more is not.
 */
export function TransferDispatchDialog({
  transfer,
  onClose,
}: {
  transfer: TransferRow;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const branches = useQuery(branchesQuery());

  const [sourceBranchId, setSourceBranchId] = useState<number | null>(
    transfer.sourceBranchId ?? null,
  );
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Allocation>({});
  const [formError, setFormError] = useState<string | null>(null);

  const items = transfer.items ?? [];
  const variantIds = items.map((item) => item.productVariantId);

  const lots = useQuery({
    queryKey: ["inventory-lots", "dispatch", transfer.id, sourceBranchId, variantIds],
    enabled: Boolean(sourceBranchId),
    queryFn: async () => {
      const results = await Promise.all(
        items.map(async (item) => ({
          itemId: item.id,
          lots: (
            await inventoryLotsApi.list({
              variantId: item.productVariantId,
              branchId: sourceBranchId ?? undefined,
              page: 1,
            })
          ).items,
        })),
      );
      return results;
    },
  });

  const dispatch = useMutation({
    mutationFn: () =>
      stockTransfersApi.dispatch(transfer.id, {
        sourceBranchId: sourceBranchId ?? 0,
        notes: notes.trim() || null,
        lots: Object.entries(allocations)
          .map(([composite, value]) => {
            const [itemId, lotId] = composite.split(":");
            return {
              stockTransferItemId: Number(itemId),
              inventoryLotId: Number(lotId),
              quantity: Number(value) || 0,
            };
          })
          .filter((line) => line.quantity > 0),
      }),
    onSuccess: () => {
      toast.success(t("transfers.dispatched"));
      void queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      onClose();
    },
    onError: (error) => setFormError(isApiError(error) ? error.message : (error as Error).message),
  });

  const totalFor = (itemId: number) =>
    Object.entries(allocations)
      .filter(([composite]) => composite.startsWith(`${itemId}:`))
      .reduce((sum, [, value]) => sum + (Number(value) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (!sourceBranchId) {
            setFormError(t("common.required"));
            return;
          }
          const anything = Object.values(allocations).some((value) => Number(value) > 0);
          if (!anything) {
            setFormError(t("transfers.noSelection"));
            return;
          }
          for (const item of items) {
            if (totalFor(item.id) > item.quantityRequested) {
              setFormError(t("transfers.overAllocated"));
              return;
            }
          }
          dispatch.mutate();
        }}
        className="my-auto w-full max-w-3xl space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">{t("transfers.dispatchTitle")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

        <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs text-muted-foreground">
          {t("transfers.dispatchHint")}
        </p>

        {formError && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {formError}
          </p>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("transfers.source")}</span>
          <AppSelect
            value={sourceBranchId ?? ""}
            disabled={Boolean(transfer.sourceBranchId)}
            onChange={(event) => {
              setSourceBranchId(event.target.value ? Number(event.target.value) : null);
              setAllocations({});
            }}
            className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring disabled:opacity-60"
          >
            <option value="">{t("transfers.source")}</option>
            {(branches.data ?? [])
              .filter((branch) => branch.id !== transfer.destinationBranchId)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </AppSelect>
        </label>

        {!sourceBranchId ? null : lots.isPending ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const itemLots = lots.data?.find((entry) => entry.itemId === item.id)?.lots ?? [];
              return (
                <div key={item.id} className="rounded-lg border border-border p-3">
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
                      {t("transfers.requested")}:{" "}
                      <span className="font-semibold text-foreground">
                        {formatNumber(item.quantityRequested, locale)}
                      </span>{" "}
                      · {t("transfers.allocate")}:{" "}
                      <span className="font-semibold text-foreground">
                        {formatNumber(totalFor(item.id), locale)}
                      </span>
                    </p>
                  </div>

                  {itemLots.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("stock.noLotsForVariant")}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {itemLots.map((lot) => {
                        const available =
                          lot.branches?.find((branch) => branch.branchId === sourceBranchId)
                            ?.quantity ?? lot.totalQuantity;
                        return (
                          <li
                            key={lot.id}
                            className="flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-numeric truncate text-xs text-foreground">
                                {lot.lotNumber}
                              </p>
                              <p className="text-[0.7rem] text-muted-foreground">
                                {t("transfers.available")}: {formatNumber(available, locale)}
                                {lot.expiryDate
                                  ? ` · ${t("stock.expiryDate")} ${formatDate(lot.expiryDate, locale)}`
                                  : ""}
                              </p>
                            </div>
                            <input
                              inputMode="numeric"
                              value={allocations[key(item.id, lot.id)] ?? ""}
                              onChange={(event) =>
                                setAllocations((current) => ({
                                  ...current,
                                  [key(item.id, lot.id)]: event.target.value.replace(/[^\d]/g, ""),
                                }))
                              }
                              aria-label={t("common.quantity")}
                              max={available}
                              className="font-numeric h-9 w-20 rounded-md border border-input bg-background px-2 text-center text-sm outline-none focus:border-ring"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("transfers.notes")}</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={dispatch.isPending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {dispatch.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("transfers.dispatch")}
          </button>
        </div>
      </form>
    </div>
  );
}
