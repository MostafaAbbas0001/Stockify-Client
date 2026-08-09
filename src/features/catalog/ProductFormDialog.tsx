import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/common/AppSelect";
import { FormDialog } from "@/components/common/FormDialog";
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
  });
  const [assigned, setAssigned] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (const attribute of product?.attributes ?? []) initial[attribute.attributeId] = true;
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
        attributeIds: Object.keys(assigned).map(Number),
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

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      pending={save.isPending}
      title={product ? t("products.editProduct") : t("products.newProduct")}
      className="max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        setFieldErrors({});
        setFormError(null);
        if (!form.name.trim()) {
          setFieldErrors({ name: t("common.required") });
          return;
        }
        save.mutate();
      }}
      actions={
        <>
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
        </>
      }
    >
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
          <AppSelect
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
          </AppSelect>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("products.category")}</span>
          <AppSelect
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
          </AppSelect>
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

      <div className="space-y-2 rounded-lg border border-border p-3">
        <div>
          <p className="text-xs font-semibold text-foreground">{t("products.attributes")}</p>
          <p className="text-[0.7rem] text-muted-foreground">{t("products.attributesHint")}</p>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(attributes.data ?? []).map((attribute) => {
            const checked = attribute.id in assigned;
            return (
              <label
                key={attribute.id}
                className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs font-medium text-foreground"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setAssigned((current) => {
                      const next = { ...current };
                      if (event.target.checked) next[attribute.id] = true;
                      else delete next[attribute.id];
                      return next;
                    })
                  }
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="truncate">{attribute.name}</span>
              </label>
            );
          })}
        </div>
      </div>
    </FormDialog>
  );
}
