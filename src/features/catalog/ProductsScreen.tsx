import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/common/AppSelect";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    <div className="space-y-6">
      <PageHeader
        title={t("products.title")}
        description={t("products.subtitle")}
        actions={
          can(PERM.productCreate) ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              <Plus className="size-4" />
              {t("products.newProduct")}
            </button>
          ) : null
        }
      />

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("products.searchPlaceholder")}
                className="min-w-0 flex-1 sm:min-w-56"
              />
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative grid size-11 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-primary sm:hidden"
                aria-label={t("common.filters")}
              >
                <SlidersHorizontal className="size-4" />
                {(brandId || categoryId) && (
                  <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-primary" />
                )}
              </button>
              <AppSelect
                value={brandId ?? ""}
                onChange={(event) => {
                  setBrandId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("products.brand")}
                className="hidden h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-ring sm:block"
              >
                <option value="">{t("common.all")}</option>
                {(brands.data ?? []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </AppSelect>
              <AppSelect
                value={categoryId ?? ""}
                onChange={(event) => {
                  setCategoryId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("products.category")}
                className="hidden h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-ring sm:block"
              >
                <option value="">{t("common.all")}</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AppSelect>
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
            <div className="grid gap-3 p-3 md:hidden">
              {products.data.items.map((product) => (
                <article
                  key={product.id}
                  className="rounded-xl border border-border/80 bg-background p-3 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-sunken text-muted-foreground">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Package className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/products/$productId"
                        params={{ productId: String(product.id) }}
                        className="block truncate text-sm font-semibold text-foreground"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[product.brandName, product.categoryName].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                    </div>
                    <ProductActions
                      product={product}
                      canUpdate={can(PERM.productUpdate)}
                      canDelete={can(PERM.productDelete)}
                      onEdit={() => {
                        setEditing(product);
                        setFormOpen(true);
                      }}
                      onDelete={() => {
                        setDeleteError(null);
                        setDeleting(product);
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
            <TableShell className="hidden md:block">
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th>{t("products.brand")}</Th>
                  <Th>{t("products.category")}</Th>
                  <Th align="end">{t("common.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {products.data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <Td className="font-medium">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-sunken text-muted-foreground">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <Package className="size-4" />
                          )}
                        </span>
                        <Link
                          to="/products/$productId"
                          params={{ productId: String(product.id) }}
                          className="hover:text-primary"
                        >
                          {product.name}
                        </Link>
                      </div>
                    </Td>
                    <Td>{product.brandName ?? "—"}</Td>
                    <Td>{product.categoryName ?? "—"}</Td>
                    <Td align="end">
                      <div className="flex justify-end">
                        <ProductActions
                          product={product}
                          canUpdate={can(PERM.productUpdate)}
                          canDelete={can(PERM.productDelete)}
                          onEdit={() => {
                            setEditing(product);
                            setFormOpen(true);
                          }}
                          onDelete={() => {
                            setDeleteError(null);
                            setDeleting(product);
                          }}
                        />
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

      {filtersOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/45 backdrop-blur-sm sm:hidden">
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t("common.close")}
            onClick={() => setFiltersOpen(false)}
          />
          <div className="relative w-full rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">{t("common.filters")}</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t("common.close")}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold">{t("products.brand")}</span>
                <AppSelect
                  value={brandId ?? ""}
                  onChange={(event) => {
                    setBrandId(event.target.value ? Number(event.target.value) : null);
                    setPage(1);
                  }}
                  className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("common.all")}</option>
                  {(brands.data ?? []).map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </AppSelect>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">{t("products.category")}</span>
                <AppSelect
                  value={categoryId ?? ""}
                  onChange={(event) => {
                    setCategoryId(event.target.value ? Number(event.target.value) : null);
                    setPage(1);
                  }}
                  className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("common.all")}</option>
                  {(categories.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </AppSelect>
              </label>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBrandId(null);
                    setCategoryId(null);
                    setPage(1);
                  }}
                  className="h-12 rounded-xl border border-border font-semibold text-foreground"
                >
                  {t("common.clearFilters")}
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="h-12 rounded-xl bg-primary font-semibold text-primary-foreground"
                >
                  {t("common.done")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

function ProductActions({
  product,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  product: ProductSummary;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-foreground">
        <MoreHorizontal className="size-4" />
        <span className="sr-only">{t("common.actions")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem asChild>
          <Link to="/products/$productId" params={{ productId: String(product.id) }}>
            <Eye className="size-4" />
            {t("common.view")}
          </Link>
        </DropdownMenuItem>
        {canUpdate && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" />
            {t("common.edit")}
          </DropdownMenuItem>
        )}
        {canDelete && <DropdownMenuSeparator />}
        {canDelete && (
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
            <Trash2 className="size-4" />
            {t("common.delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
