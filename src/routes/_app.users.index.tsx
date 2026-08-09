import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/common/AppSelect";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { RequirePermission } from "@/components/common/RequirePermission";
import { SearchInput } from "@/components/common/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { branchesQuery, rolesQuery } from "@/features/reference/queries";
import { UserFormDialog } from "@/features/users/UserFormDialog";
import { UserPermissionsDialog } from "@/features/users/UserPermissionsDialog";
import { useI18n } from "@/i18n";
import { usersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { UserRow } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

type UsersSearch = {
  q?: string | undefined;
  role?: number | undefined;
  branch?: number | undefined;
  page: number;
};

export const Route = createFileRoute("/_app/users/")({
  validateSearch: (raw: Record<string, unknown>): UsersSearch => ({
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
    role: Number(raw["role"]) > 0 ? Number(raw["role"]) : undefined,
    branch: Number(raw["branch"]) > 0 ? Number(raw["branch"]) : undefined,
    page: Math.max(1, Number(raw["page"]) || 1),
  }),
  component: UsersRoute,
});

function UsersRoute() {
  return (
    <RequirePermission permission={TAB.users}>
      <UsersScreen />
    </RequirePermission>
  );
}

function UsersScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
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
        page: resetPage ? 1 : (patch.page ?? previous.page),
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
    <div className="space-y-6">
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        actions={
          can(PERM.usersCreate) && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" />
              {t("users.newUser")}
            </button>
          )
        }
      />
      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={filters.q ?? ""}
                onChange={(q) => setFilters({ q: q || undefined })}
                placeholder={t("users.searchPlaceholder")}
                className="min-w-56"
              />
              <AppSelect
                value={filters.role ?? ""}
                onChange={(event) =>
                  setFilters({ role: event.target.value ? Number(event.target.value) : undefined })
                }
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
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
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
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
          <div className="p-6">
            <LoadingState />
          </div>
        ) : users.isError ? (
          <div className="p-6">
            <ErrorState error={users.error} onRetry={() => void users.refetch()} />
          </div>
        ) : users.data.items.length === 0 ? (
          <div className="p-6">
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
                  <Th>{t("users.role")}</Th>
                  <Th>{t("common.branch")}</Th>
                  <Th>{t("common.createdAt")}</Th>
                  <Th align="end">{t("common.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <Td className="font-medium">{row.username}</Td>
                    <Td>{row.role}</Td>
                    <Td>{row.branch}</Td>
                    <Td>{formatDate(row.createdAt, locale)}</Td>
                    <Td align="end">
                      <div className="flex justify-end gap-1">
                        {can(PERM.usersUpdate) && (
                          <>
                            <button
                              type="button"
                              aria-label={t("users.permissions")}
                              onClick={() => setPermissionsUser(row)}
                              className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <KeyRound className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={t("common.edit")}
                              onClick={() => {
                                setEditing(row);
                                setFormOpen(true);
                              }}
                              className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </>
                        )}
                        {row.id !== 1 && can(PERM.usersDelete) && (
                          <button
                            type="button"
                            aria-label={t("common.delete")}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(row);
                            }}
                            className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-destructive"
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
