import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { ProductFormDialog } from "@/features/catalog/products/components/ProductFormDialog";
import { VariantFormDialog } from "@/features/catalog/products/components/VariantFormDialog";
import { useI18n } from "@/shared/i18n";
import { productVariantsApi, productsApi } from "@/features/catalog/products/api";
import { isApiError } from "@/shared/api/errors";
import { formatMoney } from "@/shared/lib/format";
import type { ProductVariantRow } from "@/features/catalog/products/types";
import { Button } from "@/shared/ui/button";

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

  if (product.isPending)
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  if (product.isError)
    return (
      <Card>
        <ErrorState error={product.error} onRetry={() => void product.refetch()} />
      </Card>
    );

  const detail = product.data;

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: t("products.title"), to: "/products" }, { label: detail.name }]}
        title={detail.name}
        actions={
          <>
            {can(PERM.productUpdate) && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                {t("common.edit")}
              </Button>
            )}
            {can(PERM.variantCreate) && (
              <Button
                onClick={() => {
                  setEditingVariant(null);
                  setVariantOpen(true);
                }}
              >
                <Plus className="size-4" />
                {t("products.newVariant")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("products.overview")} />
          <dl className="p-4">
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              <OverviewField label={t("products.brand")} value={detail.brandName ?? "—"} />
              <OverviewField label={t("products.category")} value={detail.categoryName ?? "—"} />
            </div>
            <div className="mt-4 border-t border-border pt-3">
              <dt className="text-[13px] text-muted-foreground">{t("products.attributes")}</dt>
              <dd className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5">
                {(detail.attributes ?? []).length === 0
                  ? "—"
                  : (detail.attributes ?? []).map((attribute) => (
                      <StatusBadge key={attribute.attributeId} tone="info">
                        {attribute.name}
                      </StatusBadge>
                    ))}
              </dd>
            </div>
          </dl>
          {detail.description && (
            <p className="border-t border-border px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
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
                className="md:w-64"
              />
            }
          />

          {variants.isPending ? (
            <div>
              <LoadingState />
            </div>
          ) : variants.isError ? (
            <div>
              <ErrorState error={variants.error} onRetry={() => void variants.refetch()} />
            </div>
          ) : variants.data.items.length === 0 ? (
            <div>
              <EmptyState filtered={Boolean(search)} title={t("products.noVariants")} />
            </div>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("products.sku")}</Th>
                    <Th>{t("products.attributes")}</Th>
                    <Th align="end" width="sm">
                      {t("common.price")}
                    </Th>
                    <Th align="end" width="sm">
                      {t("products.cost")}
                    </Th>
                    <Th align="end" actions>
                      {t("common.actions")}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {variants.data.items.map((variant) => (
                    <tr key={variant.id} className="hover:bg-muted/50">
                      <Td className="font-medium">
                        <span className="block">{variant.sku}</span>
                        {variant.barcode && (
                          <span className="block text-xs text-muted-foreground">
                            {variant.barcode}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {(variant.attributes ?? []).length === 0
                          ? "—"
                          : (variant.attributes ?? [])
                              .map((attribute) => `${attribute.name}: ${attribute.value}`)
                              .join(", ")}
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(variant.price, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(variant.netPrice, locale)}
                      </Td>
                      <Td align="end">
                        <div className="flex items-center justify-end gap-1">
                          {can(PERM.variantUpdate) && (
                            <Button
                              type="button"
                              aria-label={t("common.edit")}
                              onClick={() => {
                                setEditingVariant(variant);
                                setVariantOpen(true);
                              }}
                              variant="quiet"
                              size="icon-sm"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {can(PERM.variantDelete) && (
                            <Button
                              type="button"
                              aria-label={t("common.delete")}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(variant);
                              }}
                              variant="quiet-destructive"
                              size="icon-sm"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
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

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}
