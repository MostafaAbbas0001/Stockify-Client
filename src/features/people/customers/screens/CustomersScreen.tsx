import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { CustomerFormDialog } from "@/features/people/customers/components/CustomerFormDialog";
import { useI18n } from "@/shared/i18n";
import { customersApi } from "@/features/people/customers/api";
import { isApiError } from "@/shared/api/errors";
import type { Customer } from "@/features/people/customers/types";
import { formatDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

export function CustomersScreen() {
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
      <PageHeader
        title={t("customers.title")}
        description={t("customers.subtitle")}
        actions={
          can(PERM.customerCreate) && (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("customers.newCustomer")}
            </Button>
          )
        }
      />

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
              className="md:w-64"
            />
          }
        />

        {customers.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : customers.isError ? (
          <div>
            <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
          </div>
        ) : customers.data.items.length === 0 ? (
          <div>
            <EmptyState filtered={search.length > 0} title={t("customers.noCustomers")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th width="md">{t("common.phone")}</Th>
                  <Th>{t("common.email")}</Th>
                  <Th>{t("common.address")}</Th>
                  <Th width="sm">{t("common.createdAt")}</Th>
                  {(canEdit || canDelete) && (
                    <Th align="end" actions>
                      {t("common.actions")}
                    </Th>
                  )}
                </tr>
              </thead>
              <tbody>
                {customers.data.items.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/50">
                    <Td>
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: String(customer.id) }}
                        className="font-medium text-primary-strong underline-offset-4 hover:underline"
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
                            <Button
                              type="button"
                              aria-label={t("common.edit")}
                              onClick={() => {
                                setEditing(customer);
                                setFormOpen(true);
                              }}
                              variant="quiet"
                              size="icon-sm"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              aria-label={t("common.delete")}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(customer);
                              }}
                              variant="quiet-destructive"
                              size="icon-sm"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
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
