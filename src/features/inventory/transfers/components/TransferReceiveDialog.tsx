import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/shared/i18n";
import { stockTransfersApi } from "@/features/inventory/transfers/api";
import { isApiError } from "@/shared/api/errors";
import type { TransferRow } from "@/features/inventory/transfers/types";
import { formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { CheckboxField, Field, FormError } from "@/shared/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

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
    <Dialog open onOpenChange={(next) => !next && !receive.isPending && onClose()}>
      <DialogContent size="2xl">
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
          className="space-y-4"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t("transfers.receiveTitle")}</DialogTitle>
            <DialogDescription>{t("transfers.receiveHint")}</DialogDescription>
          </DialogHeader>

          <FormError>{formError}</FormError>

          <div className="space-y-3">
            {items.map((item) => (
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
                    {t("transfers.sent")} {formatNumber(item.quantitySent, locale)},{" "}
                    {t("transfers.received")} {formatNumber(item.quantityReceived, locale)}
                  </p>
                </div>

                <ul className="space-y-2">
                  {(item.lots ?? []).map((lot) => (
                    <li
                      key={lot.inventoryLotId}
                      className="flex items-center gap-3 rounded-control border border-border px-3.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium tabular-nums text-foreground">
                          {lot.lotNumber ?? `#${lot.inventoryLotId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("transfers.sent")} {formatNumber(lot.quantitySent, locale)},{" "}
                          {t("transfers.received")} {formatNumber(lot.quantityReceived, locale)}
                        </p>
                      </div>
                      <Input
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
                        className="w-20 text-center"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <CheckboxField
            checked={complete}
            onChange={setComplete}
            label={t("transfers.markComplete")}
          />

          <Field label={t("transfers.notes")}>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
          </Field>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={receive.isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={receive.isPending}>
              {t("transfers.receive")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
