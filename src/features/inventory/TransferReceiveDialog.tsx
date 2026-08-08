import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { stockTransfersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { TransferRow } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

const key = (itemId: number, lotId: number) => `${itemId}:${lotId}`;

/**
 * Records a receipt. Quantities are cumulative totals per dispatched lot:
 * they may not drop below what is already received, nor exceed what was sent.
 */
export function TransferReceiveDialog({
  transfer,
  onClose,
}: {
  transfer: TransferRow;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const items = (transfer.items ?? []).filter((item) => (item.lots ?? []).length > 0);

  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of transfer.items ?? []) {
      for (const lot of item.lots ?? []) {
        initial[key(item.id, lot.inventoryLotId)] = String(lot.quantityReceived);
      }
    }
    return initial;
  });
  const [complete, setComplete] = useState(true);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const receive = useMutation({
    mutationFn: () =>
      stockTransfersApi.receive(transfer.id, {
        notes: notes.trim() || null,
        complete,
        lots: Object.entries(quantities).map(([composite, value]) => {
          const [itemId, lotId] = composite.split(":");
          return {
            stockTransferItemId: Number(itemId),
            inventoryLotId: Number(lotId),
            quantityReceived: Number(value) || 0,
          };
        }),
      }),
    onSuccess: () => {
      toast.success(t("transfers.received2"));
      void queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      onClose();
    },
    onError: (error) => setFormError(isApiError(error) ? error.message : (error as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          for (const item of items) {
            for (const lot of item.lots ?? []) {
              const value = Number(quantities[key(item.id, lot.inventoryLotId)] ?? 0);
              if (value < lot.quantityReceived || value > lot.quantitySent) {
                setFormError(t("transfers.receiveRange"));
                return;
              }
            }
          }
          receive.mutate();
        }}
        className="my-auto w-full max-w-2xl space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">{t("transfers.receiveTitle")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

        <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs text-muted-foreground">
          {t("transfers.receiveHint")}
        </p>

        {formError && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {formError}
          </p>
        )}

        <div className="space-y-3">
          {items.map((item) => (
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
                  {t("transfers.sent")}: {formatNumber(item.quantitySent, locale)} ·{" "}
                  {t("transfers.received")}: {formatNumber(item.quantityReceived, locale)}
                </p>
              </div>

              <ul className="mt-2 space-y-2">
                {(item.lots ?? []).map((lot) => (
                  <li
                    key={lot.inventoryLotId}
                    className="flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-numeric truncate text-xs text-foreground">
                        {lot.lotNumber ?? `#${lot.inventoryLotId}`}
                      </p>
                      <p className="text-[0.7rem] text-muted-foreground">
                        {t("transfers.sent")}: {formatNumber(lot.quantitySent, locale)} ·{" "}
                        {t("transfers.received")}: {formatNumber(lot.quantityReceived, locale)}
                      </p>
                    </div>
                    <input
                      inputMode="numeric"
                      value={quantities[key(item.id, lot.inventoryLotId)] ?? ""}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [key(item.id, lot.inventoryLotId)]: event.target.value.replace(
                            /[^\d]/g,
                            "",
                          ),
                        }))
                      }
                      aria-label={t("transfers.received")}
                      className="font-numeric h-9 w-20 rounded-md border border-input bg-background px-2 text-center text-sm outline-none focus:border-ring"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-foreground">
          <input
            type="checkbox"
            checked={complete}
            onChange={(event) => setComplete(event.target.checked)}
            className="size-3.5 accent-[var(--primary)]"
          />
          {t("transfers.markComplete")}
        </label>

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
            disabled={receive.isPending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {receive.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("transfers.receive")}
          </button>
        </div>
      </form>
    </div>
  );
}
