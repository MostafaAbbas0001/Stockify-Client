import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { VariantPicker } from "@/features/inventory/VariantPicker";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { stockTransfersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { ProductVariantRow } from "@/lib/api/types";

type DraftLine = { variant: ProductVariantRow; quantity: string };

/** Requests a new transfer (Draft). Source branch may be decided at dispatch. */
export function TransferFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const branches = useQuery(branchesQuery());

  const [sourceBranchId, setSourceBranchId] = useState<number | null>(null);
  const [destinationBranchId, setDestinationBranchId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [picking, setPicking] = useState<ProductVariantRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      stockTransfersApi.create({
        sourceBranchId,
        destinationBranchId: destinationBranchId ?? 0,
        notes: notes.trim() || null,
        items: lines.map((line) => ({
          productVariantId: line.variant.id,
          quantity: Number(line.quantity) || 0,
        })),
      }),
    onSuccess: () => {
      toast.success(t("transfers.created"));
      void queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      onOpenChange(false);
    },
    onError: (error) => setFormError(isApiError(error) ? error.message : (error as Error).message),
  });

  if (!open) return null;

  const addLine = (variant: ProductVariantRow | null) => {
    if (!variant) return;
    setPicking(null);
    setLines((current) =>
      current.some((line) => line.variant.id === variant.id)
        ? current
        : [...current, { variant, quantity: "1" }],
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (!destinationBranchId) {
            setFormError(t("common.required"));
            return;
          }
          if (lines.length === 0 || lines.some((line) => !Number(line.quantity))) {
            setFormError(t("transfers.noSelection"));
            return;
          }
          if (sourceBranchId && sourceBranchId === destinationBranchId) {
            setFormError(t("transfers.sameBranch"));
            return;
          }
          create.mutate();
        }}
        className="my-auto w-full max-w-2xl space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t("transfers.requestTransfer")}
          </h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

        {formError && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {formError}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("transfers.source")}</span>
            <select
              value={sourceBranchId ?? ""}
              onChange={(event) =>
                setSourceBranchId(event.target.value ? Number(event.target.value) : null)
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              <option value="">{t("transfers.sourceLater")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">
              {t("transfers.destination")}
            </span>
            <select
              value={destinationBranchId ?? ""}
              onChange={(event) =>
                setDestinationBranchId(event.target.value ? Number(event.target.value) : null)
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              <option value="">{t("transfers.destination")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t("transfers.items")}</span>
            <span className="text-[0.7rem] text-muted-foreground">
              {t("transfers.itemCount", { count: lines.length })}
            </span>
          </div>

          <VariantPicker value={picking} onChange={addLine} label={t("transfers.addItem")} />

          {lines.length > 0 && (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.variant.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {line.variant.productName}
                    </p>
                    <p className="font-numeric truncate text-xs text-muted-foreground">
                      {line.variant.sku}
                    </p>
                  </div>
                  <input
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.variant.id === line.variant.id
                            ? { ...item, quantity: event.target.value.replace(/[^\d]/g, "") }
                            : item,
                        ),
                      )
                    }
                    aria-label={t("common.quantity")}
                    className="font-numeric h-9 w-20 rounded-md border border-input bg-background px-2 text-center text-sm outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    aria-label={t("common.remove")}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((item) => item.variant.id !== line.variant.id),
                      )
                    }
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-error-soft hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
            onClick={() => onOpenChange(false)}
            className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("transfers.requestTransfer")}
          </button>
        </div>
      </form>
    </div>
  );
}
