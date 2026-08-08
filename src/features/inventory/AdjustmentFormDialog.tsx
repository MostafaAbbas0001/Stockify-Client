import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { VariantPicker } from "@/features/inventory/VariantPicker";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { adjustmentsApi, inventoryLotsApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { AdjustmentRow, ProductVariantRow } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Signed inventory adjustment. The UI collects a direction plus a positive
 * quantity and sends the signed value the backend expects.
 */
export function AdjustmentFormDialog({
  open,
  onOpenChange,
  adjustment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: AdjustmentRow | null;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const branches = useQuery(branchesQuery());

  const [variant, setVariant] = useState<ProductVariantRow | null>(
    adjustment
      ? ({
          id: adjustment.variantId,
          sku: adjustment.sku,
          productName: adjustment.productName ?? "",
          imageUrl: null,
          price: 0,
          netPrice: 0,
          attributes: null,
        } as unknown as ProductVariantRow)
      : null,
  );
  const [branchId, setBranchId] = useState<number | null>(adjustment?.branchId ?? null);
  const [lotId, setLotId] = useState<number | null>(adjustment?.inventoryLotId ?? null);
  const [direction, setDirection] = useState<"add" | "remove">(
    adjustment && adjustment.quantity < 0 ? "remove" : "add",
  );
  const [quantity, setQuantity] = useState(adjustment ? String(Math.abs(adjustment.quantity)) : "");
  const [reason, setReason] = useState(adjustment?.reason ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const lots = useQuery({
    queryKey: ["inventory-lots", "for-variant", variant?.id, branchId],
    queryFn: () =>
      inventoryLotsApi.list({
        variantId: variant?.id,
        branchId: branchId ?? undefined,
        includeEmpty: true,
        page: 1,
      }),
    enabled: Boolean(variant),
  });

  const save = useMutation({
    mutationFn: () => {
      const signed = (direction === "remove" ? -1 : 1) * Number(quantity);
      const body = {
        variantId: variant?.id ?? 0,
        branchId: branchId ?? 0,
        inventoryLotId: lotId ?? 0,
        quantity: signed,
        reason: reason.trim(),
      };
      return adjustment ? adjustmentsApi.update(adjustment.id, body) : adjustmentsApi.create(body);
    },
    onSuccess: () => {
      toast.success(adjustment ? t("stock.adjustmentUpdated") : t("stock.adjustmentCreated"));
      void queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
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

  const lotOptions = lots.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFieldErrors({});
          setFormError(null);
          const amount = Number(quantity);
          if (
            !variant ||
            !branchId ||
            !lotId ||
            !amount ||
            Number.isNaN(amount) ||
            !reason.trim()
          ) {
            setFormError(t("common.required"));
            return;
          }
          save.mutate();
        }}
        className="my-auto w-full max-w-md space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {adjustment ? t("stock.editAdjustment") : t("stock.newAdjustment")}
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

        <VariantPicker
          value={variant}
          onChange={(next) => {
            setVariant(next);
            setLotId(null);
          }}
          error={fieldErrors["variantId"] ?? null}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("stock.branch")}</span>
            <select
              value={branchId ?? ""}
              onChange={(event) => {
                setBranchId(event.target.value ? Number(event.target.value) : null);
                setLotId(null);
              }}
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              <option value="">{t("stock.branch")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {fieldErrors["branchId"] && (
              <span className="block text-[0.7rem] text-destructive">
                {fieldErrors["branchId"]}
              </span>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("transfers.lot")}</span>
            <select
              value={lotId ?? ""}
              onChange={(event) => setLotId(event.target.value ? Number(event.target.value) : null)}
              disabled={!variant}
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring disabled:opacity-50"
            >
              <option value="">{t("stock.selectLot")}</option>
              {lotOptions.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.isInternal ? t("stock.internalLot") : (lot.lotNumber ?? `#${lot.id}`)} ·{" "}
                  {lot.totalQuantity}
                </option>
              ))}
            </select>
            {variant && !lots.isPending && lotOptions.length === 0 && (
              <span className="block text-[0.7rem] text-muted-foreground">
                {t("stock.noLotsForVariant")}
              </span>
            )}
          </label>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-foreground">{t("stock.direction")}</span>
          <div className="grid grid-cols-2 gap-2">
            {(["add", "remove"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDirection(option)}
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium",
                  direction === option
                    ? option === "add"
                      ? "border-success bg-success-soft text-success"
                      : "border-destructive bg-error-soft text-destructive"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {option === "add" ? t("stock.addStock") : t("stock.removeStock")}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("common.quantity")}</span>
          <input
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value.replace(/[^\d]/g, ""))}
            className="font-numeric h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          />
          {fieldErrors["quantity"] && (
            <span className="block text-[0.7rem] text-destructive">{fieldErrors["quantity"]}</span>
          )}
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("stock.reason")}</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          />
          {fieldErrors["reason"] && (
            <span className="block text-[0.7rem] text-destructive">{fieldErrors["reason"]}</span>
          )}
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
            disabled={save.isPending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
