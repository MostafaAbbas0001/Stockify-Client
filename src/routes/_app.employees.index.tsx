import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/common/AppSelect";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { RequirePermission } from "@/components/common/RequirePermission";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { EmployeeFormDialog } from "@/features/employees/EmployeeFormDialog";
import { EmployeeSalesSummary } from "@/features/employees/EmployeeSalesSummary";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { employeesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { EmployeeRow } from "@/lib/api/types";

export const Route = createFileRoute("/_app/employees/")({
  component: EmployeesRoute,
});

function EmployeesRoute() {
  return (
    <RequirePermission permission={TAB.employees}>
      <EmployeesScreen />
    </RequirePermission>
  );
}

function EmployeesScreen() {
  const { t } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [salesOnly, setSalesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [deleting, setDeleting] = useState<EmployeeRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmployeeRow | null>(null);

  const branches = useQuery(branchesQuery());
  const employees = useQuery({
    queryKey: ["employees", { search, branchId, salesOnly, page }],
    queryFn: () =>
      employeesApi.list({
        search: search || undefined,
        branchId: branchId ?? undefined,
        isSale: salesOnly || undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => employeesApi.remove(id),
    onSuccess: () => {
      toast.success(t("employees.deleted"));
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleting(null);
      setDeleteError(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  const canEdit = can(PERM.employeeUpdate);
  const canDelete = can(PERM.employeeDelete);
  const filtered = Boolean(search || branchId || salesOnly);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("employees.title")}
        description={t("employees.subtitle")}
        actions={
          can(PERM.employeeCreate) && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {t("employees.newEmployee")}
            </button>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
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
                  placeholder={t("employees.searchPlaceholder")}
                  className="min-w-56 flex-1"
                />
                <AppSelect
                  value={branchId ?? ""}
                  onChange={(event) => {
                    setBranchId(event.target.value ? Number(event.target.value) : null);
                    setPage(1);
                  }}
                  aria-label={t("common.branch")}
                  className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                >
                  <option value="">{t("common.all")}</option>
                  {(branches.data ?? []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </AppSelect>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={salesOnly}
                    onChange={(event) => {
                      setSalesOnly(event.target.checked);
                      setPage(1);
                    }}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {t("employees.salespersonFilter")}
                </label>
              </div>
            }
          />

          {employees.isPending ? (
            <div className="p-6">
              <LoadingState />
            </div>
          ) : employees.isError ? (
            <div className="p-6">
              <ErrorState error={employees.error} onRetry={() => void employees.refetch()} />
            </div>
          ) : employees.data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState filtered={filtered} title={t("employees.noEmployees")} />
            </div>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("common.name")}</Th>
                    <Th>{t("common.branch")}</Th>
                    <Th>{t("common.phone")}</Th>
                    <Th>{t("common.email")}</Th>
                    <Th>{t("employees.isSalesperson")}</Th>
                    <Th align="end">{t("common.actions")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {employees.data.items.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/employees/$employeeId"
                          params={{ employeeId: String(employee.id) }}
                          className="font-medium text-primary hover:underline"
                        >
                          {employee.name}
                        </Link>
                      </Td>
                      <Td>{employee.branchName ?? "—"}</Td>
                      <Td>{employee.phone || "—"}</Td>
                      <Td>{employee.email || "—"}</Td>
                      <Td>
                        <StatusBadge tone={employee.isSale ? "success" : "neutral"}>
                          {employee.isSale ? t("common.yes") : t("common.no")}
                        </StatusBadge>
                      </Td>
                      <Td align="end">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={t("employees.salesSummary")}
                            onClick={() => setSelected(employee)}
                            className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <BarChart3 className="size-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              aria-label={t("common.edit")}
                              onClick={() => {
                                setEditing(employee);
                                setFormOpen(true);
                              }}
                              className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
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
                                setDeleting(employee);
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
                page={employees.data.page}
                totalPages={employees.data.totalPages}
                totalCount={employees.data.totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>

        {selected ? (
          <EmployeeSalesSummary
            key={selected.id}
            employeeId={selected.id}
            employeeName={selected.name}
          />
        ) : (
          <Card className="h-fit">
            <CardHeader title={t("employees.salesSummary")} />
            <div className="p-6">
              <EmptyState title={t("employees.salesSummary")} />
            </div>
          </Card>
        )}
      </div>

      {formOpen && (
        <EmployeeFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          employee={editing}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("employees.deleteTitle")}
        body={t("employees.deleteBody")}
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
