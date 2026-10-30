import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { FormDialog } from "@/shared/components/FormDialog";
import { useI18n } from "@/shared/i18n";
import { productVariantsApi } from "@/features/catalog/products/api";
import { isApiError } from "@/shared/api/errors";
import type { ProductDetail, ProductVariantRow } from "@/features/catalog/products/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

/** Create / edit dialog for a product variant. SKU is generated from its catalog data. */
export function VariantFormDialog({
  open,
  onOpenChange,
  product,
  variant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDetail;
  variant: ProductVariantRow | null;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const assignments = product.attributes ?? [];

  const [barcode, setBarcode] = useState(variant?.barcode ?? "");
  const [imageUrl, setImageUrl] = useState(variant?.imageUrl ?? "");
  const [price, setPrice] = useState(variant ? String(variant.price) : "");
  const [netPrice, setNetPrice] = useState(variant ? String(variant.netPrice) : "");
  const [values, setValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const attribute of variant?.attributes ?? []) {
      if (attribute.attributeId && attribute.valueId)
        initial[attribute.attributeId] = String(attribute.valueId);
    }
    return initial;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const selected = Object.entries(values)
        .filter(([, valueId]) => valueId)
        .map(([attributeId, valueId]) => ({
          attributeId: Number(attributeId),
          valueId: Number(valueId),
        }));
      if (variant) {
        return productVariantsApi.patch(variant.id, {
          barcode: barcode.trim() || null,
          imageUrl: imageUrl.trim() || null,
          price: Number(price),
          netPrice: Number(netPrice),
          attributes: selected,
        });
      }
      return productVariantsApi.create({
        productId: product.id,
        barcode: barcode.trim() || null,
        imageUrl: imageUrl.trim() || null,
        price: Number(price),
        netPrice: Number(netPrice),
        attributes: selected,
      });
    },
    onSuccess: () => {
      toast.success(variant ? t("products.variantUpdated") : t("products.variantCreated"));
      void queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
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
      title={variant ? t("products.editVariant") : t("products.newVariant")}
      size="lg"
      onSubmit={(event) => {
        event.preventDefault();
        setFieldErrors({});
        setFormError(null);
        if (!price || Number.isNaN(Number(price)) || !netPrice || Number.isNaN(Number(netPrice))) {
          setFormError(t("common.required"));
          return;
        }
        const missing = assignments.find((assignment) => !values[assignment.attributeId]);
        if (missing) {
          setFormError(`${missing.name}: ${t("common.required")}`);
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

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("products.barcode")}
          </span>
          <Input
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            className="w-full"
          />
          {fieldErrors["barcode"] && (
            <span className="block text-xs text-destructive">{fieldErrors["barcode"]}</span>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">{t("common.price")}</span>
          <Input
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-full"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("products.cost")}
          </span>
          <Input
            inputMode="decimal"
            value={netPrice}
            onChange={(event) => setNetPrice(event.target.value)}
            className="w-full"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">
          {t("products.imageUrl")}
        </span>
        <Input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="w-full"
        />
      </label>

      {assignments.length > 0 && (
        <div className="grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
          {assignments.map((assignment) => (
            <label key={assignment.attributeId} className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">
                {assignment.name}
                <span className="text-muted-foreground"> *</span>
              </span>
              <AppSelect
                value={values[assignment.attributeId] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [assignment.attributeId]: event.target.value,
                  }))
                }
                className="w-full"
              >
                <option value="">—</option>
                {assignment.values.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.value}
                  </option>
                ))}
              </AppSelect>
            </label>
          ))}
        </div>
      )}
    </FormDialog>
  );
}
