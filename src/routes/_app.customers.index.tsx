import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { RequirePermission } from "@/components/common/RequirePermission";
import { SearchInput } from "@/components/common/SearchInput";
import { Card, CardHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { CustomerFormDialog } from "@/features/customers/CustomerFormDialog";
import { useI18n } from "@/i18n";
import { customersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — Stockify" },
      {
        name: "description",
        content:
          "Stockify customer directory: search contacts, add new customers and keep phone, email and address details current.",
      },
      { property: "og:title", content: "Customers — Stockify" },
      {
        property: "og:description",
        content: "Manage the Stockify customer directory used at the point of sale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersRoute,
});

function CustomersRoute() {
  return (
    <RequirePermission permission={TAB.customers}>
      <CustomersScreen />
    </RequirePermission>
  );
}

function CustomersScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers", { search, page }],
    queryFn: () => customersApi.list({ search: search || undefined, page }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: () => {
      toast.success(t("customers.deleted"));
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleting(null);
      setDeleteError(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  const canEdit = can(PERM.customerUpdate);
  const canDelete = can(PERM.customerDelete);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t("customers.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("customers.subtitle")}</p>
        </div>
        {can(PERM.customerCreate) && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t("customers.newCustomer")}
          </button>
        )}
      </div>

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("customers.searchPlaceholder")}
              className="min-w-64"
            />
          }
        />

        {customers.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : customers.isError ? (
          <div className="p-6">
            <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
          </div>
        ) : customers.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={search.length > 0} title={t("customers.noCustomers")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th>{t("common.phone")}</Th>
                  <Th>{t("common.email")}</Th>
                  <Th>{t("common.address")}</Th>
                  <Th>{t("common.createdAt")}</Th>
                  {(canEdit || canDelete) && <Th align="end">{t("common.actions")}</Th>}
                </tr>
              </thead>
              <tbody>
                {customers.data.items.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/50">
                    <Td>
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: String(customer.id) }}
                        className="font-medium text-primary hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </Td>
                    <Td>{customer.phone || "—"}</Td>
                    <Td>{customer.email || "—"}</Td>
                    <Td className="max-w-64 truncate">{customer.address || "—"}</Td>
                    <Td>{formatDate(customer.createdAt, locale)}</Td>
                    {(canEdit || canDelete) && (
                      <Td align="end">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              aria-label={t("common.edit")}
                              onClick={() => {
                                setEditing(customer);
                                setFormOpen(true);
                              }}
                              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              aria-label={t("common.delete")}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(customer);
                              }}
                              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-error-soft hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination
              page={customers.data.page}
              totalPages={customers.data.totalPages}
              totalCount={customers.data.totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {formOpen && (
        <CustomerFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={editing}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("customers.deleteTitle")}
        body={t("customers.deleteBody")}
        confirmLabel={t("common.delete")}
        tone="destructive"
        pending={remove.isPending}
        error={deleteError}
        onCancel={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
