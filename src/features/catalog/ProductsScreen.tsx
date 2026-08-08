import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { ProductFormDialog } from "@/features/catalog/ProductFormDialog";
import { brandsQuery, categoriesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { productsApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { ProductSummary } from "@/lib/api/types";

/** Paged catalog product list with brand / category filters. */
export function ProductsScreen() {
  const { t } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSummary | null>(null);
  const [deleting, setDeleting] = useState<ProductSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const brands = useQuery(brandsQuery());
  const categories = useQuery(categoriesQuery());
  const products = useQuery({
    queryKey: ["products", { search, brandId, categoryId, page }],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        brandId: brandId ?? undefined,
        categoryId: categoryId ?? undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  const destroy = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      toast.success(t("products.deleted"));
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleting(null);
      setDeleteError(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  const filtered = Boolean(search || brandId || categoryId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground">{t("products.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("products.subtitle")}</p>
        </div>
        {can(PERM.productCreate) && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t("products.newProduct")}
          </button>
        )}
      </div>

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("products.searchPlaceholder")}
                className="min-w-56 flex-1"
              />
              <select
                value={brandId ?? ""}
                onChange={(event) => {
                  setBrandId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("products.brand")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              >
                <option value="">{t("common.all")}</option>
                {(brands.data ?? []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select
                value={categoryId ?? ""}
                onChange={(event) => {
                  setCategoryId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("products.category")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              >
                <option value="">{t("common.all")}</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {products.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : products.isError ? (
          <div className="p-6">
            <ErrorState error={products.error} onRetry={() => void products.refetch()} />
          </div>
        ) : products.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={filtered} title={t("products.noProducts")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th>{t("products.brand")}</Th>
                  <Th>{t("products.category")}</Th>
                  <Th>{t("products.tracking")}</Th>
                  <Th align="end">{t("common.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {products.data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <Td className="font-medium">
                      <Link
                        to="/products/$productId"
                        params={{ productId: String(product.id) }}
                        className="hover:text-primary hover:underline"
                      >
                        {product.name}
                      </Link>
                    </Td>
                    <Td>{product.brandName ?? "—"}</Td>
                    <Td>{product.categoryName ?? "—"}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {product.requiresLotTracking && (
                          <StatusBadge tone="info">{t("products.lotTracking")}</StatusBadge>
                        )}
                        {product.requiresExpiryDate && (
                          <StatusBadge tone="warning">{t("products.expiryTracking")}</StatusBadge>
                        )}
                        {!product.requiresLotTracking && !product.requiresExpiryDate && "—"}
                      </div>
                    </Td>
                    <Td align="end">
                      <div className="flex items-center justify-end gap-1">
                        {can(PERM.productUpdate) && (
                          <button
                            type="button"
                            aria-label={t("common.edit")}
                            onClick={() => {
                              setEditing(product);
                              setFormOpen(true);
                            }}
                            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {can(PERM.productDelete) && (
                          <button
                            type="button"
                            aria-label={t("common.delete")}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(product);
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
              page={products.data.page}
              totalPages={products.data.totalPages}
              totalCount={products.data.totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {formOpen && (
        <ProductFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          product={editing}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("products.deleteTitle")}
        body={t("products.deleteBody")}
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
