import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { FormDialog } from "@/shared/components/FormDialog";
import { VariantPicker } from "@/features/inventory/stock/components/VariantPicker";
import { useI18n } from "@/shared/i18n";
import { inventoryLotsApi } from "@/features/inventory/stock/api";
import { isApiError } from "@/shared/api/errors";
import type { ProductVariantRow } from "@/features/catalog/products/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

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
        lotNumber: lotNumber.trim(),
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

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      pending={save.isPending}
      title={t("stock.newLot")}
      size="md"
      onSubmit={(event) => {
        event.preventDefault();
        setFieldErrors({});
        setFormError(null);
        if (!variant) {
          setFormError(t("stock.pickVariant"));
          return;
        }
        if (!lotNumber.trim()) {
          setFieldErrors({ lotNumber: t("common.required") });
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
            {t("common.create")}
          </Button>
        </>
      }
    >
      <p className="rounded-control border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        {t("stock.lotCreateHint")}
      </p>

      {formError && <FormError>{formError}</FormError>}

      <VariantPicker
        value={variant}
        onChange={setVariant}
        error={fieldErrors["variantId"] ?? null}
      />

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">
          {t("stock.lotNumber")}
        </span>
        <Input
          value={lotNumber}
          onChange={(event) => setLotNumber(event.target.value)}
          className="w-full uppercase"
        />
        {fieldErrors["lotNumber"] && (
          <span className="block text-xs text-destructive">{fieldErrors["lotNumber"]}</span>
        )}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("stock.manufacturingDate")}
          </span>
          <Input
            type="date"
            value={manufacturingDate}
            onChange={(event) => setManufacturingDate(event.target.value)}
            className="w-full"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("stock.expiryDate")}
          </span>
          <Input
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
            className="w-full"
          />
          {fieldErrors["expiryDate"] && (
            <span className="block text-xs text-destructive">{fieldErrors["expiryDate"]}</span>
          )}
        </label>
      </div>
    </FormDialog>
  );
}
