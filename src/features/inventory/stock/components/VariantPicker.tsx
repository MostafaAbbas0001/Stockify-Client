import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, X } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/shared/i18n";
import { productVariantsApi } from "@/features/catalog/products/api";
import type { ProductVariantRow } from "@/features/catalog/products/types";
import { Button } from "@/shared/ui/button";
import { labelClass } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

/** Search-and-select control for product variants (SKU level). */
export function VariantPicker({
  value,
  onChange,
  label,
  error,
}: {
  value: ProductVariantRow | null;
  onChange: (variant: ProductVariantRow | null) => void;
  label?: string;
  error?: string | null;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const results = useQuery({
    queryKey: ["product-variants", "picker", search],
    queryFn: () => productVariantsApi.list({ search: search || undefined, page: 1 }),
    placeholderData: keepPreviousData,
    enabled: open,
  });

  if (value) {
    return (
      <div className="space-y-1.5">
        <span className={labelClass}>{label ?? t("stock.variant")}</span>
        <div className="flex items-center justify-between gap-2 rounded-control bg-muted py-1.5 ps-3.5 pe-1.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{value.productName}</p>
            <p className="tabular-nums truncate text-xs text-muted-foreground">{value.sku}</p>
          </div>
          <Button
            type="button"
            aria-label={t("common.clear")}
            onClick={() => onChange(null)}
            variant="quiet"
            size="icon-sm"
            className="shrink-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className={labelClass}>{label ?? t("stock.variant")}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted-foreground" />
        <Input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          placeholder={t("stock.searchVariants")}
          aria-label={label ?? t("stock.variant")}
          className="ps-10"
        />
      </div>
      {error && <span className="block text-xs text-destructive">{error}</span>}
      {open && (
        <div className="max-h-60 overflow-y-auto rounded-control border border-border bg-card p-1 shadow-card">
          {results.isFetching && !results.data ? (
            <p className="flex items-center gap-2 px-3 py-3 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("common.loading")}
            </p>
          ) : (results.data?.items.length ?? 0) === 0 ? (
            <p className="px-3 py-3 text-[13px] text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <ul>
              {(results.data?.items ?? []).map((variant) => (
                <li key={variant.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(variant);
                      setOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-start transition-colors hover:bg-muted focus-visible:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">
                        {variant.productName}
                      </span>
                      <span className="tabular-nums block truncate text-xs text-muted-foreground">
                        {variant.sku}
                        {variant.barcode ? `, ${variant.barcode}` : ""}
                      </span>
                    </span>
                    <Check className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
