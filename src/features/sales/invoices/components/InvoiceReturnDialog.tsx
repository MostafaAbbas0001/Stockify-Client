import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TableShell, Td, Th } from "@/shared/components/Surface";
import { useI18n } from "@/shared/i18n";
import { invoicesApi } from "@/features/sales/invoices/api";
import { isApiError } from "@/shared/api/errors";
import type { InvoiceItem } from "@/features/sales/invoices/types";
import { formatMoney, formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field, FormError } from "@/shared/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

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

  return (
    <Dialog open={open} onOpenChange={(next) => !createReturn.isPending && onOpenChange(next)}>
      <DialogContent size="2xl">
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
          className="space-y-4"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t("invoices.returnTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("invoices.returnTitle")}</DialogDescription>
          </DialogHeader>

          <FormError>{error}</FormError>

          <Field label={t("invoices.returnHeaderReason")}>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>

          <div className="overflow-hidden rounded-control border border-border">
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th align="end" width="xs">
                    {t("invoices.purchased")}
                  </Th>
                  <Th align="end" width="xs">
                    {t("invoices.returned")}
                  </Th>
                  <Th align="end" width="sm">
                    {t("invoices.returnQty")}
                  </Th>
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
                        <span className="block text-start">
                          <span className="block font-medium text-foreground">
                            {item.productName ?? "—"}
                          </span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {item.sku ?? ""}
                          </span>
                        </span>
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatNumber(item.quantity, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatNumber(returned, locale)}
                      </Td>
                      <Td align="end">
                        {line && line.remaining > 0 ? (
                          <Input
                            value={quantities[id] ?? ""}
                            onChange={(event) =>
                              setQuantities((prev) => ({ ...prev, [id]: event.target.value }))
                            }
                            inputMode="numeric"
                            max={line.remaining}
                            placeholder={`0 / ${line.remaining}`}
                            aria-label={`${t("invoices.returnQty")}: ${item.productName ?? id}`}
                            className="w-24 text-end tabular-nums"
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

          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t("invoices.refundPreview")}</p>
              <p className="text-xs text-muted-foreground">{t("invoices.refundPreviewNote")}</p>
            </div>
            <p className="shrink-0 text-heading-sm font-semibold tabular-nums text-foreground">
              {formatMoney(refundPreview, locale)}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={createReturn.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={createReturn.isPending}>
              {t("invoices.returnItems")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
