import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, KeyValue, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { ProductFormDialog } from "@/features/catalog/ProductFormDialog";
import { VariantFormDialog } from "@/features/catalog/VariantFormDialog";
import { useI18n } from "@/i18n";
import { productVariantsApi, productsApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import type { ProductVariantRow } from "@/lib/api/types";

/** Product overview plus the variant grid for that product. */
export function ProductDetailScreen({ productId }: { productId: number }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [variantOpen, setVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantRow | null>(null);
  const [deleting, setDeleting] = useState<ProductVariantRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const product = useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: () => productsApi.get(productId),
  });

  const variants = useQuery({
    queryKey: ["product-variants", { productId, search, page }],
    queryFn: () => productsApi.variants(productId, { search: search || undefined, page }),
    placeholderData: keepPreviousData,
  });

  const destroy = useMutation({
    mutationFn: (id: number) => productVariantsApi.remove(id),
    onSuccess: () => {
      toast.success(t("products.variantDeleted"));
      void queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      setDeleting(null);
      setDeleteError(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  if (product.isPending) return <LoadingState />;
  if (product.isError)
    return <ErrorState error={product.error} onRetry={() => void product.refetch()} />;

  const detail = product.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 rtl:rotate-180" />
            {t("products.title")}
          </Link>
          <h1 className="truncate text-lg font-semibold text-foreground">{detail.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[detail.brandName, detail.categoryName].filter(Boolean).join(" • ") || "—"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {can(PERM.productUpdate) && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Pencil className="size-4" />
              {t("common.edit")}
            </button>
          )}
          {can(PERM.variantCreate) && (
            <button
              type="button"
              onClick={() => {
                setEditingVariant(null);
                setVariantOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {t("products.newVariant")}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title={t("products.overview")} />
          <div className="divide-y divide-border px-4">
            <KeyValue label={t("products.brand")} value={detail.brandName ?? "—"} />
            <KeyValue label={t("products.category")} value={detail.categoryName ?? "—"} />
            <KeyValue
              label={t("products.lotTracking")}
              value={detail.requiresLotTracking ? t("common.yes") : t("common.no")}
            />
            <KeyValue
              label={t("products.expiryTracking")}
              value={detail.requiresExpiryDate ? t("common.yes") : t("common.no")}
            />
            <KeyValue
              label={t("products.attributes")}
              value={
                (detail.attributes ?? []).length === 0 ? (
                  "—"
                ) : (
                  <span className="flex flex-wrap justify-end gap-1">
                    {(detail.attributes ?? []).map((attribute) => (
                      <StatusBadge
                        key={attribute.attributeId}
                        tone={attribute.isRequired ? "info" : "neutral"}
                      >
                        {attribute.name}
                      </StatusBadge>
                    ))}
                  </span>
                )
              }
            />
          </div>
          {detail.description && (
            <p className="border-t border-border p-4 text-xs leading-relaxed text-muted-foreground">
              {detail.description}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("products.variants")}
            actions={
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("products.searchVariants")}
                className="min-w-56"
              />
            }
          />

          {variants.isPending ? (
            <div className="p-6">
              <LoadingState />
            </div>
          ) : variants.isError ? (
            <div className="p-6">
              <ErrorState error={variants.error} onRetry={() => void variants.refetch()} />
            </div>
          ) : variants.data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState filtered={Boolean(search)} title={t("products.noVariants")} />
            </div>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("products.sku")}</Th>
                    <Th>{t("products.attributes")}</Th>
                    <Th align="end">{t("common.price")}</Th>
                    <Th align="end">{t("products.cost")}</Th>
                    <Th align="end">{t("common.actions")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {variants.data.items.map((variant) => (
                    <tr key={variant.id} className="hover:bg-muted/50">
                      <Td className="font-medium">
                        <span className="block">{variant.sku}</span>
                        {variant.barcode && (
                          <span className="block text-[0.7rem] text-muted-foreground">
                            {variant.barcode}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {(variant.attributes ?? []).length === 0
                          ? "—"
                          : (variant.attributes ?? [])
                              .map((attribute) => `${attribute.name}: ${attribute.value}`)
                              .join(" • ")}
                      </Td>
                      <Td align="end">{formatMoney(variant.price, locale)}</Td>
                      <Td align="end">{formatMoney(variant.netPrice, locale)}</Td>
                      <Td align="end">
                        <div className="flex items-center justify-end gap-1">
                          {can(PERM.variantUpdate) && (
                            <button
                              type="button"
                              aria-label={t("common.edit")}
                              onClick={() => {
                                setEditingVariant(variant);
                                setVariantOpen(true);
                              }}
                              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                          {can(PERM.variantDelete) && (
                            <button
                              type="button"
                              aria-label={t("common.delete")}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(variant);
                              }}
                              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-error-soft hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination
                page={variants.data.page}
                totalPages={variants.data.totalPages}
                totalCount={variants.data.totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      </div>

      {editOpen && (
        <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={detail} />
      )}

      {variantOpen && (
        <VariantFormDialog
          key={editingVariant?.id ?? "new"}
          open={variantOpen}
          onOpenChange={setVariantOpen}
          product={detail}
          variant={editingVariant}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("products.deleteVariantTitle")}
        body={t("products.deleteVariantBody")}
        confirmLabel={t("common.delete")}
        tone="destructive"
        pending={destroy.isPending}
        error={deleteError}
        onCancel={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        onConfirm={() => deleting && destroy.mutate(deleting.id)}
      />
    </div>
  );
}
