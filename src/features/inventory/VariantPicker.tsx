import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, X } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/i18n";
import { productVariantsApi } from "@/lib/api/endpoints";
import type { ProductVariantRow } from "@/lib/api/types";

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
      <div className="space-y-1">
        <span className="text-xs font-medium text-foreground">{label ?? t("stock.variant")}</span>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{value.productName}</p>
            <p className="font-numeric truncate text-xs text-muted-foreground">{value.sku}</p>
          </div>
          <button
            type="button"
            aria-label={t("common.clear")}
            onClick={() => onChange(null)}
            className="grid size-7 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-foreground">{label ?? t("stock.variant")}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          placeholder={t("stock.searchVariants")}
          className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-sm outline-none focus:border-ring"
        />
      </div>
      {error && <span className="block text-[0.7rem] text-destructive">{error}</span>}
      {open && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card">
          {results.isFetching && !results.data ? (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("common.loading")}
            </p>
          ) : (results.data?.items.length ?? 0) === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {(results.data?.items ?? []).map((variant) => (
                <li key={variant.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(variant);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start hover:bg-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">
                        {variant.productName}
                      </span>
                      <span className="font-numeric block truncate text-xs text-muted-foreground">
                        {variant.sku}
                        {variant.barcode ? ` · ${variant.barcode}` : ""}
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
