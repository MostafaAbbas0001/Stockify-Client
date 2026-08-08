import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { productVariantsApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { ProductDetail, ProductVariantRow } from "@/lib/api/types";

/** Create / edit dialog for a product variant (SKU, pricing, attribute values). */
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

  const [sku, setSku] = useState(variant?.sku ?? "");
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
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          imageUrl: imageUrl.trim() || null,
          price: Number(price),
          netPrice: Number(netPrice),
          attributes: selected,
        });
      }
      return productVariantsApi.create({
        productId: product.id,
        sku: sku.trim() || null,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFieldErrors({});
          setFormError(null);
          if (
            !price ||
            Number.isNaN(Number(price)) ||
            !netPrice ||
            Number.isNaN(Number(netPrice))
          ) {
            setFormError(t("common.required"));
            return;
          }
          const missing = assignments.find(
            (assignment) => assignment.isRequired && !values[assignment.attributeId],
          );
          if (missing) {
            setFormError(`${missing.name}: ${t("common.required")}`);
            return;
          }
          save.mutate();
        }}
        className="my-auto w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {variant ? t("products.editVariant") : t("products.newVariant")}
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
            <span className="text-xs font-medium text-foreground">{t("products.sku")}</span>
            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder={t("products.skuAuto")}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
            {fieldErrors["sku"] && (
              <span className="block text-[0.7rem] text-destructive">{fieldErrors["sku"]}</span>
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("products.barcode")}</span>
            <input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
            {fieldErrors["barcode"] && (
              <span className="block text-[0.7rem] text-destructive">{fieldErrors["barcode"]}</span>
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("common.price")}</span>
            <input
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("products.cost")}</span>
            <input
              inputMode="decimal"
              value={netPrice}
              onChange={(event) => setNetPrice(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("products.imageUrl")}</span>
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          />
        </label>

        {assignments.length > 0 && (
          <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
            {assignments.map((assignment) => (
              <label key={assignment.attributeId} className="block space-y-1">
                <span className="text-xs font-medium text-foreground">
                  {assignment.name}
                  {assignment.isRequired && <span className="text-destructive"> *</span>}
                </span>
                <select
                  value={values[assignment.attributeId] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [assignment.attributeId]: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                >
                  <option value="">—</option>
                  {assignment.values.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.value}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

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
