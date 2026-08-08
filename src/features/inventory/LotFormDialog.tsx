import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { VariantPicker } from "@/features/inventory/VariantPicker";
import { useI18n } from "@/i18n";
import { inventoryLotsApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { ProductVariantRow } from "@/lib/api/types";

/**
 * Registers lot metadata for a variant. The backend creates the lot only —
 * quantity is added afterwards through an inventory adjustment.
 */
export function LotFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [variant, setVariant] = useState<ProductVariantRow | null>(null);
  const [lotNumber, setLotNumber] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      inventoryLotsApi.create({
        variantId: variant?.id ?? 0,
        lotNumber: lotNumber.trim() || null,
        manufacturingDate: manufacturingDate || null,
        expiryDate: expiryDate || null,
      }),
    onSuccess: () => {
      toast.success(t("stock.lotCreated"));
      void queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (isApiError(error) && error.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) mapped[key.charAt(0).toLowerCase() + key.slice(1)] = messages[0];
        }
        setFieldErrors(mapped);
        setFormError(null);
      } else {
        setFormError(isApiError(error) ? error.message : (error as Error).message);
      }
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFieldErrors({});
          setFormError(null);
          if (!variant) {
            setFormError(t("stock.pickVariant"));
            return;
          }
          save.mutate();
        }}
        className="my-auto w-full max-w-md space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">{t("stock.newLot")}</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

        <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs text-muted-foreground">
          {t("stock.lotCreateHint")}
        </p>

        {formError && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {formError}
          </p>
        )}

        <VariantPicker
          value={variant}
          onChange={setVariant}
          error={fieldErrors["variantId"] ?? null}
        />

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("stock.lotNumber")}</span>
          <input
            value={lotNumber}
            onChange={(event) => setLotNumber(event.target.value)}
            className="font-numeric h-10 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase outline-none focus:border-ring"
          />
          {fieldErrors["lotNumber"] && (
            <span className="block text-[0.7rem] text-destructive">{fieldErrors["lotNumber"]}</span>
          )}
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">
              {t("stock.manufacturingDate")}
            </span>
            <input
              type="date"
              value={manufacturingDate}
              onChange={(event) => setManufacturingDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("stock.expiryDate")}</span>
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
            {fieldErrors["expiryDate"] && (
              <span className="block text-[0.7rem] text-destructive">
                {fieldErrors["expiryDate"]}
              </span>
            )}
          </label>
        </div>

        <p className="text-[0.7rem] text-muted-foreground">{t("stock.lotMetadataUntracked")}</p>

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
            disabled={save.isPending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("common.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
