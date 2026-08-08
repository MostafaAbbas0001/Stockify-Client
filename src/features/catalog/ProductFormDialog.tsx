import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { attributesQuery, brandsQuery, categoriesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { productsApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { ProductSummary } from "@/lib/api/types";

type FormState = {
  name: string;
  description: string;
  imageUrl: string;
  brandId: string;
  categoryId: string;
  requiresLotTracking: boolean;
  requiresExpiryDate: boolean;
};

/** Create / edit dialog for catalog products, including attribute assignment. */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductSummary | null;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const brands = useQuery(brandsQuery());
  const categories = useQuery(categoriesQuery());
  const attributes = useQuery(attributesQuery());

  const [form, setForm] = useState<FormState>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    imageUrl: product?.imageUrl ?? "",
    brandId: product?.brandId ? String(product.brandId) : "",
    categoryId: product?.categoryId ? String(product.categoryId) : "",
    requiresLotTracking: product?.requiresLotTracking ?? false,
    requiresExpiryDate: product?.requiresExpiryDate ?? false,
  });
  const [assigned, setAssigned] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (const attribute of product?.attributes ?? [])
      initial[attribute.attributeId] = attribute.isRequired;
    return initial;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        brandId: form.brandId ? Number(form.brandId) : null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        requiresLotTracking: form.requiresLotTracking,
        requiresExpiryDate: form.requiresExpiryDate,
        attributes: Object.entries(assigned).map(([attributeId, isRequired]) => ({
          attributeId: Number(attributeId),
          isRequired,
        })),
      };
      return product ? productsApi.update(product.id, body) : productsApi.create(body);
    },
    onSuccess: () => {
      toast.success(product ? t("products.updated") : t("products.created"));
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
          if (!form.name.trim()) {
            setFieldErrors({ name: t("common.required") });
            return;
          }
          if (form.requiresExpiryDate && !form.requiresLotTracking) {
            setFormError(t("products.expiryRequiresLot"));
            return;
          }
          save.mutate();
        }}
        className="my-auto w-full max-w-xl space-y-3 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {product ? t("products.editProduct") : t("products.newProduct")}
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

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("common.name")}</span>
          <input
            autoFocus
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          />
          {fieldErrors["name"] && (
            <span className="block text-[0.7rem] text-destructive">{fieldErrors["name"]}</span>
          )}
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("products.brand")}</span>
            <select
              value={form.brandId}
              onChange={(event) => setForm({ ...form, brandId: event.target.value })}
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              <option value="">—</option>
              {(brands.data ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("products.category")}</span>
            <select
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              <option value="">—</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("products.description")}</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:border-ring"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("products.imageUrl")}</span>
          <input
            value={form.imageUrl}
            onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.requiresLotTracking}
              onChange={(event) =>
                setForm({
                  ...form,
                  requiresLotTracking: event.target.checked,
                  requiresExpiryDate: event.target.checked ? form.requiresExpiryDate : false,
                })
              }
              className="size-4 accent-[var(--primary)]"
            />
            {t("products.lotTracking")}
          </label>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.requiresExpiryDate}
              onChange={(event) =>
                setForm({
                  ...form,
                  requiresExpiryDate: event.target.checked,
                  requiresLotTracking: event.target.checked ? true : form.requiresLotTracking,
                })
              }
              className="size-4 accent-[var(--primary)]"
            />
            {t("products.expiryTracking")}
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div>
            <p className="text-xs font-semibold text-foreground">{t("products.attributes")}</p>
            <p className="text-[0.7rem] text-muted-foreground">{t("products.attributesHint")}</p>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(attributes.data ?? []).map((attribute) => {
              const checked = attribute.id in assigned;
              return (
                <div
                  key={attribute.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-2"
                >
                  <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setAssigned((current) => {
                          const next = { ...current };
                          if (event.target.checked) next[attribute.id] = false;
                          else delete next[attribute.id];
                          return next;
                        })
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="truncate">{attribute.name}</span>
                  </label>
                  {checked && (
                    <label className="flex shrink-0 items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={assigned[attribute.id] ?? false}
                        onChange={(event) =>
                          setAssigned((current) => ({
                            ...current,
                            [attribute.id]: event.target.checked,
                          }))
                        }
                        className="size-3.5 accent-[var(--primary)]"
                      />
                      {t("products.required")}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
