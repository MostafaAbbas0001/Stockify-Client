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
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { ProductFormDialog } from "@/features/catalog/products/components/ProductFormDialog";
import { brandsQuery } from "@/features/catalog/brands/queries";
import { categoriesQuery } from "@/features/catalog/categories/queries";
import { useI18n } from "@/shared/i18n";
import { productsApi } from "@/features/catalog/products/api";
import { isApiError } from "@/shared/api/errors";
import type { ProductSummary } from "@/features/catalog/products/types";
import { Button } from "@/shared/ui/button";
import { buttonVariants } from "@/shared/ui/variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field } from "@/shared/ui/field";

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
    <div className="space-y-4">
      <PageHeader
        title={t("products.title")}
        description={t("products.subtitle")}
        actions={
          can(PERM.productCreate) ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="shrink-0"
            >
              <Plus className="size-4" />
              {t("products.newProduct")}
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <div className="flex w-full items-center gap-2 md:w-auto">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("products.searchPlaceholder")}
                className="min-w-0 flex-1 md:w-64 md:flex-none"
              />
              <Button
                type="button"
                onClick={() => setFiltersOpen(true)}
                aria-label={t("common.filters")}
                variant="secondary"
                size="icon"
                className="relative sm:hidden"
              >
                <SlidersHorizontal className="size-4" />
                {(brandId || categoryId) && (
                  <span className="absolute end-2 top-2 size-2 rounded-full bg-primary" />
                )}
              </Button>
              <AppSelect
                value={brandId ?? ""}
                onChange={(event) => {
                  setBrandId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                aria-label={t("products.brand")}
                className="hidden sm:flex sm:w-44"
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
                className="hidden sm:flex sm:w-44"
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
          <div>
            <LoadingState />
          </div>
        ) : products.isError ? (
          <div>
            <ErrorState error={products.error} onRetry={() => void products.refetch()} />
          </div>
        ) : products.data.items.length === 0 ? (
          <div>
            <EmptyState filtered={filtered} title={t("products.noProducts")} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {products.data.items.map((product) => (
                <li key={product.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
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
                        className="block truncate text-sm font-medium text-foreground"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[product.brandName, product.categoryName].filter(Boolean).join(", ") ||
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
                </li>
              ))}
            </ul>
            <TableShell className="hidden md:block" stack={false}>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th width="md">{t("products.brand")}</Th>
                  <Th width="md">{t("products.category")}</Th>
                  <Th align="end" actions>
                    {t("common.actions")}
                  </Th>
                </tr>
              </thead>
              <tbody>
                {products.data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <Td className="font-medium">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <Package className="size-4" />
                          )}
                        </span>
                        <Link
                          to="/products/$productId"
                          params={{ productId: String(product.id) }}
                          className="font-medium text-primary-strong underline-offset-4 hover:underline"
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

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("common.filters")}</DialogTitle>
            <DialogDescription className="sr-only">{t("common.filters")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label={t("products.brand")}>
              <AppSelect
                value={brandId ?? ""}
                onChange={(event) => {
                  setBrandId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                className="w-full"
              >
                <option value="">{t("common.all")}</option>
                {(brands.data ?? []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </AppSelect>
            </Field>
            <Field label={t("products.category")}>
              <AppSelect
                value={categoryId ?? ""}
                onChange={(event) => {
                  setCategoryId(event.target.value ? Number(event.target.value) : null);
                  setPage(1);
                }}
                className="w-full"
              >
                <option value="">{t("common.all")}</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AppSelect>
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setBrandId(null);
                setCategoryId(null);
                setPage(1);
              }}
            >
              {t("common.clearFilters")}
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>{t("common.done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <DropdownMenuTrigger className={buttonVariants({ variant: "quiet", size: "icon" })}>
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
          <DropdownMenuItem
            className="text-destructive focus:text-destructive [&>svg]:text-destructive"
            onSelect={onDelete}
          >
            <Trash2 className="size-4" />
            {t("common.delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
