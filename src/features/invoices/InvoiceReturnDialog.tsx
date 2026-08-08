import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { MoneyRow, TableShell, Td, Th } from "@/components/common/Surface";
import { useI18n } from "@/i18n";
import { invoicesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { InvoiceItem } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";

type Line = {
  invoiceItemId: number;
  label: string;
  sku: string;
  remaining: number;
  unitPrice: number;
};

/** Creates a credit memo for selected invoice lines. */
export function InvoiceReturnDialog({
  open,
  onOpenChange,
  invoiceId,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  items: InvoiceItem[];
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo<Line[]>(
    () =>
      items
        .map((item) => {
          const id = item.invoiceItemId ?? item.id ?? 0;
          const unitPrice = item.unitPrice ?? item.price ?? 0;
          return {
            invoiceItemId: id,
            label: item.productName ?? `#${id}`,
            sku: item.sku ?? "",
            remaining: Math.max(0, item.quantity - (item.returnedQuantity ?? 0)),
            unitPrice,
          };
        })
        .filter((line) => line.invoiceItemId > 0),
    [items],
  );

  const selected = lines
    .map((line) => ({ line, quantity: Number(quantities[line.invoiceItemId]) || 0 }))
    .filter((entry) => entry.quantity > 0);

  const refundPreview = selected.reduce(
    (total, entry) => total + entry.quantity * entry.line.unitPrice,
    0,
  );

  const createReturn = useMutation({
    mutationFn: () =>
      invoicesApi.createReturn(invoiceId, {
        reason,
        items: selected.map((entry) => ({
          invoiceItemId: entry.line.invoiceItemId,
          quantity: entry.quantity,
          reason,
        })),
      }),
    onSuccess: () => {
      toast.success(t("invoices.returnCreated"));
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setError(
        isApiError(mutationError) ? mutationError.message : (mutationError as Error).message,
      );
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (selected.length === 0) {
            setError(t("invoices.selectAtLeastOne"));
            return;
          }
          const invalid = selected.some((entry) => entry.quantity > entry.line.remaining);
          if (invalid) {
            setError(t("invoices.remainingQty"));
            return;
          }
          createReturn.mutate();
        }}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{t("invoices.returnTitle")}</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {error && (
            <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">
              {t("invoices.returnHeaderReason")}
            </span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </label>

          <div className="rounded-lg border border-border">
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th align="end">{t("invoices.purchased")}</Th>
                  <Th align="end">{t("invoices.returned")}</Th>
                  <Th align="end">{t("invoices.returnQty")}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const id = item.invoiceItemId ?? item.id ?? 0;
                  const line = lines.find((entry) => entry.invoiceItemId === id);
                  const returned = item.returnedQuantity ?? 0;
                  return (
                    <tr key={id || item.sku}>
                      <Td>
                        <span className="block font-medium text-foreground">
                          {item.productName ?? "—"}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {item.sku ?? ""}
                        </span>
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatNumber(item.quantity, locale)}
                      </Td>
                      <Td align="end" className="font-numeric tabular-nums">
                        {formatNumber(returned, locale)}
                      </Td>
                      <Td align="end">
                        {line && line.remaining > 0 ? (
                          <input
                            value={quantities[id] ?? ""}
                            onChange={(event) =>
                              setQuantities((prev) => ({ ...prev, [id]: event.target.value }))
                            }
                            inputMode="numeric"
                            max={line.remaining}
                            placeholder={`0 / ${line.remaining}`}
                            className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-end font-numeric text-sm tabular-nums outline-none focus:border-ring"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("invoices.fullyReturned")}
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </div>

          <div className="rounded-lg border border-border px-3 py-2">
            <MoneyRow
              label={t("invoices.refundPreview")}
              value={formatMoney(refundPreview, locale)}
              strong
            />
            <p className="text-[0.7rem] text-muted-foreground">{t("invoices.refundPreviewNote")}</p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={createReturn.isPending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createReturn.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("invoices.returnItems")}
          </button>
        </div>
      </form>
    </div>
  );
}
