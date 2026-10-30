import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BarChart3, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { EmployeeFormDialog } from "@/features/people/employees/components/EmployeeFormDialog";
import { EmployeeSalesSummary } from "@/features/people/employees/components/EmployeeSalesSummary";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { employeesApi } from "@/features/people/employees/api";
import { isApiError } from "@/shared/api/errors";
import type { EmployeeRow } from "@/features/people/employees/types";
import { Button } from "@/shared/ui/button";

export function EmployeesScreen() {
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
    <div className="space-y-4">
      <PageHeader
        title={t("employees.title")}
        description={t("employees.subtitle")}
        actions={
          can(PERM.employeeCreate) && (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("employees.newEmployee")}
            </Button>
          )
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader
            title={t("common.search")}
            actions={
              <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
                <SearchInput
                  className="col-span-2 md:w-64"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder={t("employees.searchPlaceholder")}
                />
                <AppSelect
                  value={branchId ?? ""}
                  onChange={(event) => {
                    setBranchId(event.target.value ? Number(event.target.value) : null);
                    setPage(1);
                  }}
                  aria-label={t("common.branch")}
                  className="col-span-2 w-full md:col-span-1 md:w-44"
                >
                  <option value="">{t("common.all")}</option>
                  {(branches.data ?? []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </AppSelect>
                <label className="col-span-2 flex h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-control bg-muted px-3.5 text-[13px] font-medium text-foreground md:col-span-1 md:h-9">
                  <input
                    type="checkbox"
                    checked={salesOnly}
                    onChange={(event) => {
                      setSalesOnly(event.target.checked);
                      setPage(1);
                    }}
                    className="size-4"
                  />
                  {t("employees.salespersonFilter")}
                </label>
              </div>
            }
          />

          {employees.isPending ? (
            <div>
              <LoadingState />
            </div>
          ) : employees.isError ? (
            <div>
              <ErrorState error={employees.error} onRetry={() => void employees.refetch()} />
            </div>
          ) : employees.data.items.length === 0 ? (
            <div>
              <EmptyState filtered={filtered} title={t("employees.noEmployees")} />
            </div>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>{t("common.name")}</Th>
                    <Th width="md">{t("common.branch")}</Th>
                    <Th width="md">{t("common.phone")}</Th>
                    <Th>{t("common.email")}</Th>
                    <Th width="sm">{t("employees.isSalesperson")}</Th>
                    <Th align="end" actions>
                      {t("common.actions")}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {employees.data.items.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/employees/$employeeId"
                          params={{ employeeId: String(employee.id) }}
                          className="font-medium text-primary-strong underline-offset-4 hover:underline"
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
                          <Button
                            type="button"
                            aria-label={t("employees.salesSummary")}
                            onClick={() => setSelected(employee)}
                            variant="quiet"
                            size="icon-sm"
                          >
                            <BarChart3 className="size-3.5" />
                          </Button>
                          {canEdit && (
                            <Button
                              type="button"
                              aria-label={t("common.edit")}
                              onClick={() => {
                                setEditing(employee);
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
                                setDeleting(employee);
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
            <div>
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
