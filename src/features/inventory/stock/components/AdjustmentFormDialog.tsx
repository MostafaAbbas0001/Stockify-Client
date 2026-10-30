import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { FormDialog } from "@/shared/components/FormDialog";
import { VariantPicker } from "@/features/inventory/stock/components/VariantPicker";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { adjustmentsApi, inventoryLotsApi } from "@/features/inventory/stock/api";
import { isApiError } from "@/shared/api/errors";
import type { ProductVariantRow } from "@/features/catalog/products/types";
import type { AdjustmentRow } from "@/features/inventory/stock/types";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

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

  const lotOptions = lots.data?.items ?? [];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      pending={save.isPending}
      title={adjustment ? t("stock.editAdjustment") : t("stock.newAdjustment")}
      size="md"
      onSubmit={(event) => {
        event.preventDefault();
        setFieldErrors({});
        setFormError(null);
        const amount = Number(quantity);
        if (!variant || !branchId || !lotId || !amount || Number.isNaN(amount) || !reason.trim()) {
          setFormError(t("common.required"));
          return;
        }
        save.mutate();
      }}
      actions={
        <>
          <Button type="button" onClick={() => onOpenChange(false)} variant="secondary">
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      {formError && <FormError>{formError}</FormError>}

      <VariantPicker
        value={variant}
        onChange={(next) => {
          setVariant(next);
          setLotId(null);
        }}
        error={fieldErrors["variantId"] ?? null}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">{t("stock.branch")}</span>
          <AppSelect
            value={branchId ?? ""}
            onChange={(event) => {
              setBranchId(event.target.value ? Number(event.target.value) : null);
              setLotId(null);
            }}
            className="w-full"
          >
            <option value="">{t("stock.branch")}</option>
            {(branches.data ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </AppSelect>
          {fieldErrors["branchId"] && (
            <span className="block text-xs text-destructive">{fieldErrors["branchId"]}</span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("transfers.lot")}
          </span>
          <AppSelect
            value={lotId ?? ""}
            onChange={(event) => setLotId(event.target.value ? Number(event.target.value) : null)}
            disabled={!variant}
            className="w-full"
          >
            <option value="">{t("stock.selectLot")}</option>
            {lotOptions.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.lotNumber} ({lot.totalQuantity})
              </option>
            ))}
          </AppSelect>
          {variant && !lots.isPending && lotOptions.length === 0 && (
            <span className="block text-xs text-muted-foreground">
              {t("stock.noLotsForVariant")}
            </span>
          )}
        </label>
      </div>

      <div className="space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">
          {t("stock.direction")}
        </span>
        <div role="radiogroup" aria-label={t("stock.direction")} className="grid grid-cols-2 gap-2">
          {(["add", "remove"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={direction === option}
              onClick={() => setDirection(option)}
              className={cn(
                "h-11 rounded-control text-sm font-medium transition-colors sm:h-9",
                direction === option
                  ? option === "add"
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive text-destructive-foreground"
                  : "bg-muted text-foreground hover:bg-accent",
              )}
            >
              {option === "add" ? t("stock.addStock") : t("stock.removeStock")}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">
          {t("common.quantity")}
        </span>
        <Input
          inputMode="numeric"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value.replace(/[^\d]/g, ""))}
          className="w-full"
        />
        {fieldErrors["quantity"] && (
          <span className="block text-xs text-destructive">{fieldErrors["quantity"]}</span>
        )}
      </label>

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">{t("stock.reason")}</span>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full"
        />
        {fieldErrors["reason"] && (
          <span className="block text-xs text-destructive">{fieldErrors["reason"]}</span>
        )}
      </label>
    </FormDialog>
  );
}
