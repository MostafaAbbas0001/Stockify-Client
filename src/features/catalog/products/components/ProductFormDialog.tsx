import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { FormDialog } from "@/shared/components/FormDialog";
import { attributesQuery } from "@/features/catalog/attributes/queries";
import { brandsQuery } from "@/features/catalog/brands/queries";
import { categoriesQuery } from "@/features/catalog/categories/queries";
import { useI18n } from "@/shared/i18n";
import { productsApi } from "@/features/catalog/products/api";
import { isApiError } from "@/shared/api/errors";
import type { ProductSummary } from "@/features/catalog/products/types";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

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
      size="xl"
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

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">{t("common.name")}</span>
        <Input
          autoFocus
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="w-full"
        />
        {fieldErrors["name"] && (
          <span className="block text-xs text-destructive">{fieldErrors["name"]}</span>
        )}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("products.brand")}
          </span>
          <AppSelect
            value={form.brandId}
            onChange={(event) => setForm({ ...form, brandId: event.target.value })}
            className="w-full"
          >
            <option value="">—</option>
            {(brands.data ?? []).map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </AppSelect>
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("products.category")}
          </span>
          <AppSelect
            value={form.categoryId}
            onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            className="w-full"
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

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">
          {t("products.description")}
        </span>
        <Textarea
          rows={3}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          className="w-full"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">
          {t("products.imageUrl")}
        </span>
        <Input
          value={form.imageUrl}
          onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
          className="w-full"
        />
      </label>

      <fieldset className="space-y-2.5">
        <legend className="space-y-0.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("products.attributes")}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t("products.attributesHint")}
          </span>
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(attributes.data ?? []).map((attribute) => {
            const checked = attribute.id in assigned;
            return (
              <label
                key={attribute.id}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control bg-muted px-3.5 text-sm text-foreground sm:min-h-9"
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
                  className="size-4"
                />
                <span className="truncate">{attribute.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </FormDialog>
  );
}
