import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { LoadingState } from "@/shared/components/DataStates";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { inventoryLotsApi } from "@/features/inventory/stock/api";
import { stockTransfersApi } from "@/features/inventory/transfers/api";
import { isApiError } from "@/shared/api/errors";
import type { TransferRow } from "@/features/inventory/transfers/types";
import { formatDate, formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { Field, FormError } from "@/shared/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

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
    <Dialog open onOpenChange={(next) => !next && !dispatch.isPending && onClose()}>
      <DialogContent size="3xl">
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
          className="space-y-4"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t("transfers.dispatchTitle")}</DialogTitle>
            <DialogDescription>{t("transfers.dispatchHint")}</DialogDescription>
          </DialogHeader>

          <FormError>{formError}</FormError>

          <Field label={t("transfers.source")}>
            <AppSelect
              value={sourceBranchId ?? ""}
              disabled={Boolean(transfer.sourceBranchId)}
              onChange={(event) => {
                setSourceBranchId(event.target.value ? Number(event.target.value) : null);
                setAllocations({});
              }}
              className="w-full"
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
          </Field>

          {!sourceBranchId ? null : lots.isPending ? (
            <LoadingState />
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const itemLots = lots.data?.find((entry) => entry.itemId === item.id)?.lots ?? [];
                return (
                  <div key={item.id} className="space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.productName ?? "—"}
                        </p>
                        <p className="tabular-nums truncate text-xs text-muted-foreground">
                          {item.sku ?? item.variantSKU ?? "—"}
                        </p>
                      </div>
                      <p className="text-[13px] tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {formatNumber(totalFor(item.id), locale)}
                        </span>{" "}
                        / {formatNumber(item.quantityRequested, locale)} {t("transfers.requested")}
                      </p>
                    </div>

                    {itemLots.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("stock.noLotsForVariant")}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {itemLots.map((lot) => {
                          const available =
                            lot.branches?.find((branch) => branch.branchId === sourceBranchId)
                              ?.quantity ?? lot.totalQuantity;
                          return (
                            <li
                              key={lot.id}
                              className="flex items-center gap-3 rounded-control border border-border px-3.5 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium tabular-nums text-foreground">
                                  {lot.lotNumber}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("transfers.available")}: {formatNumber(available, locale)}
                                  {lot.expiryDate &&
                                    `, ${t("stock.expiryDate")} ${formatDate(lot.expiryDate, locale)}`}
                                </p>
                              </div>
                              <Input
                                inputMode="numeric"
                                value={allocations[key(item.id, lot.id)] ?? ""}
                                onChange={(event) =>
                                  setAllocations((current) => ({
                                    ...current,
                                    [key(item.id, lot.id)]: event.target.value.replace(
                                      /[^\d]/g,
                                      "",
                                    ),
                                  }))
                                }
                                aria-label={t("common.quantity")}
                                max={available}
                                className="w-20 text-center"
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

          <Field label={t("transfers.notes")}>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
          </Field>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={dispatch.isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={dispatch.isPending}>
              {t("transfers.dispatch")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
