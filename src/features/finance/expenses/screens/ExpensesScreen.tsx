import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, getRouteApi } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { AppSelect } from "@/shared/components/AppSelect";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { ExpenseFormDialog } from "@/features/finance/expenses/components/ExpenseFormDialog";
import { branchesQuery } from "@/features/settings/branches/queries";
import { LookupBadge } from "@/features/lookups/LookupBadge";
import { useI18n } from "@/shared/i18n";
import { expensesApi } from "@/features/finance/expenses/api";
import { endOfDayIso, formatDate, formatMoney, startOfDayIso } from "@/shared/lib/format";
import type { ExpensesSearch } from "@/features/finance/expenses/search";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

const routeApi = getRouteApi("/_app/expenses/");

export function ExpensesScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const filters = routeApi.useSearch();
  const routeNavigate = routeApi.useNavigate();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const branches = useQuery(branchesQuery());
  const roots = useQuery({
    queryKey: ["expenses", "categories", "roots"],
    queryFn: () => expensesApi.categories(),
  });
  const categories = useQuery({
    queryKey: ["expenses", "categories", filters.group],
    queryFn: () => expensesApi.categories(filters.group!),
    enabled: Boolean(filters.group),
  });
  const setFilters = (patch: Partial<ExpensesSearch>, resetPage = true) =>
    void routeNavigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? filters.page),
      }),
      replace: true,
    });
  const expenses = useQuery({
    queryKey: ["expenses", "list", filters],
    queryFn: () =>
      expensesApi.list({
        search: filters.q,
        branchId: filters.branch,
        categoryId: filters.category,
        from: filters.from ? startOfDayIso(filters.from) : undefined,
        to: filters.to ? endOfDayIso(filters.to) : undefined,
        page: filters.page,
      }),
    placeholderData: keepPreviousData,
  });
  const filtered = Boolean(
    filters.q || filters.branch || filters.group || filters.category || filters.from || filters.to,
  );
  return (
    <div className="space-y-4">
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.subtitle")}
        actions={
          can(PERM.expenseCreate) && (
            <Button type="button" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              {t("expenses.newExpense")}
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
                placeholder={t("expenses.searchPlaceholder")}
              />
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
              <AppSelect
                value={filters.group ?? ""}
                onChange={(event) =>
                  setFilters({
                    group: event.target.value ? Number(event.target.value) : undefined,
                    category: undefined,
                  })
                }
                aria-label={t("expenses.headerCategory")}
                className="w-full md:w-44"
              >
                <option value="">{t("expenses.allCategories")}</option>
                {(roots.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AppSelect>
              <AppSelect
                value={filters.category ?? ""}
                disabled={!filters.group}
                onChange={(event) =>
                  setFilters({
                    category: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                aria-label={t("expenses.lineCategory")}
                className="w-full md:w-44"
              >
                <option value="">{t("expenses.allLineCategories")}</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AppSelect>
              <Input
                type="date"
                value={filters.from ?? ""}
                onChange={(event) => setFilters({ from: event.target.value || undefined })}
                aria-label={t("common.from")}
                className="md:w-40"
              />
              <Input
                type="date"
                value={filters.to ?? ""}
                onChange={(event) => setFilters({ to: event.target.value || undefined })}
                aria-label={t("common.to")}
                className="md:w-40"
              />
            </div>
          }
        />
        {expenses.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : expenses.isError ? (
          <div>
            <ErrorState error={expenses.error} onRetry={() => void expenses.refetch()} />
          </div>
        ) : expenses.data.items.length === 0 ? (
          <div>
            <EmptyState filtered={filtered} title={t("expenses.noExpenses")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th width="sm">{t("expenses.number")}</Th>
                  <Th>{t("expenses.headerCategory")}</Th>
                  <Th align="end" width="sm">
                    {t("common.total")}
                  </Th>
                  <Th align="end" width="sm">
                    {t("common.paid")}
                  </Th>
                  <Th align="end" width="sm">
                    {t("common.balance")}
                  </Th>
                  <Th width="md">{t("common.status")}</Th>
                  <Th width="lg">{t("expenses.period")}</Th>
                  <Th width="sm">{t("common.createdAt")}</Th>
                </tr>
              </thead>
              <tbody>
                {expenses.data.items.map((row) => {
                  const balance = Math.max(0, row.totalAmount - row.paidAmount);
                  return (
                    <tr key={row.id} className="hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/expenses/$expenseId"
                          params={{ expenseId: String(row.id) }}
                          className="font-medium text-primary-strong underline-offset-4 hover:underline"
                        >
                          {row.expenseNumber ?? `#${row.id}`}
                        </Link>
                      </Td>
                      <Td>{row.categoryName ?? "—"}</Td>
                      <Td align="end" className="tabular-nums">
                        {formatMoney(row.totalAmount, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums text-foreground">
                        {formatMoney(row.paidAmount, locale)}
                      </Td>
                      <Td align="end" className="tabular-nums text-foreground">
                        {formatMoney(balance, locale)}
                      </Td>
                      <Td>
                        <LookupBadge list="expenseStatuses" code={row.paymentStatusCode} />
                      </Td>
                      <Td className="whitespace-nowrap">
                        {formatDate(row.expensePeriodStart, locale)} —{" "}
                        {formatDate(row.expensePeriodEnd, locale)}
                      </Td>
                      <Td>{formatDate(row.createdAt, locale)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={expenses.data.page}
              totalPages={expenses.data.totalPages}
              totalCount={expenses.data.totalCount}
              onPageChange={(page) => setFilters({ page }, false)}
            />
          </>
        )}
      </Card>
      {formOpen && (
        <ExpenseFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onCreated={(id) =>
            void navigate({ to: "/expenses/$expenseId", params: { expenseId: String(id) } })
          }
        />
      )}
    </div>
  );
}
