import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { rolesQuery } from "@/features/people/users/queries";
import { branchesQuery } from "@/features/settings/branches/queries";
import { UserFormDialog } from "@/features/people/users/components/UserFormDialog";
import { UserPermissionsDialog } from "@/features/people/users/components/UserPermissionsDialog";
import { useI18n } from "@/shared/i18n";
import { usersApi } from "@/features/people/users/api";
import { isApiError } from "@/shared/api/errors";
import type { UserRow } from "@/features/people/users/types";
import { formatDate } from "@/shared/lib/format";
import type { UsersSearch } from "@/features/people/users/search";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

const routeApi = getRouteApi("/_app/users/");

export function UsersScreen() {
  const { t, locale } = useI18n();
  const { can, user } = useAuth();
  const filters = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const queryClient = useQueryClient();
  const branches = useQuery(branchesQuery());
  const roles = useQuery(rolesQuery());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const setFilters = (patch: Partial<UsersSearch>, resetPage = true) =>
    void navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? filters.page),
      }),
      replace: true,
    });
  const users = useQuery({
    queryKey: ["users", filters],
    queryFn: () =>
      usersApi.list({
        search: filters.q,
        roleId: filters.role,
        branchId: filters.branch,
        page: filters.page,
      }),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      toast.success(t("users.deleted"));
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleting(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        actions={
          can(PERM.usersCreate) && (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("users.newUser")}
            </Button>
          )
        }
      />
      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
              <SearchInput
                className="col-span-2 md:w-64"
                value={filters.q ?? ""}
                onChange={(q) => setFilters({ q: q || undefined })}
                placeholder={t("users.searchPlaceholder")}
              />
              <AppSelect
                value={filters.role ?? ""}
                onChange={(event) =>
                  setFilters({ role: event.target.value ? Number(event.target.value) : undefined })
                }
                aria-label={t("users.role")}
                className="w-full md:w-44"
              >
                <option value="">{t("users.allRoles")}</option>
                {(roles.data ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </AppSelect>
              <AppSelect
                value={filters.branch ?? ""}
                onChange={(event) =>
                  setFilters({
                    branch: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                aria-label={t("common.branch")}
                className="w-full md:w-44"
              >
                <option value="">{t("common.allBranches")}</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </AppSelect>
            </div>
          }
        />
        {users.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : users.isError ? (
          <div>
            <ErrorState error={users.error} onRetry={() => void users.refetch()} />
          </div>
        ) : users.data.items.length === 0 ? (
          <div>
            <EmptyState
              filtered={Boolean(filters.q || filters.role || filters.branch)}
              title={t("users.noUsers")}
            />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("users.username")}</Th>
                  <Th width="md">{t("users.role")}</Th>
                  <Th width="md">{t("common.branch")}</Th>
                  <Th width="sm">{t("common.createdAt")}</Th>
                  <Th align="end" actions>
                    {t("common.actions")}
                  </Th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((row) => {
                  // The owner and the signed-in user cannot be deleted or have
                  // permissions edited; the API enforces the same rules.
                  const isSelf = user?.id === String(row.id);
                  const isProtected = row.isOwner === true || isSelf;
                  return (
                    <tr key={row.id} className="hover:bg-muted/50">
                      <Td>
                        <span className="block text-start">
                          <span className="flex items-center gap-2 font-medium">
                            {row.username}
                            {row.isOwner && <Badge variant="strong">{t("users.owner")}</Badge>}
                          </span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {row.email}
                          </span>
                        </span>
                      </Td>
                      <Td>{row.role}</Td>
                      <Td>{row.branch}</Td>
                      <Td>{formatDate(row.createdAt, locale)}</Td>
                      <Td align="end">
                        <div className="flex justify-end gap-1">
                          {can(PERM.usersUpdate) && (
                            <>
                              {!isProtected && (
                                <Button
                                  type="button"
                                  aria-label={t("users.permissions")}
                                  onClick={() => setPermissionsUser(row)}
                                  variant="quiet"
                                  size="icon-sm"
                                >
                                  <KeyRound className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                aria-label={t("common.edit")}
                                onClick={() => {
                                  setEditing(row);
                                  setFormOpen(true);
                                }}
                                variant="quiet"
                                size="icon-sm"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            </>
                          )}
                          {!isProtected && can(PERM.usersDelete) && (
                            <Button
                              type="button"
                              aria-label={t("common.delete")}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(row);
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
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={users.data.page}
              totalPages={users.data.totalPages}
              totalCount={users.data.totalCount}
              onPageChange={(page) => setFilters({ page }, false)}
            />
          </>
        )}
      </Card>
      {formOpen && (
        <UserFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          user={editing}
        />
      )}
      {permissionsUser && (
        <UserPermissionsDialog
          user={permissionsUser}
          onOpenChange={(open) => !open && setPermissionsUser(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("users.deleteTitle")}
        body={t("users.deleteBody")}
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
