import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { AppSelect } from "@/components/common/AppSelect";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { Pagination } from "@/components/common/Pagination";
import { RequirePermission } from "@/components/common/RequirePermission";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { ExpenseFormDialog } from "@/features/expenses/ExpenseFormDialog";
import { branchesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { expensesApi } from "@/lib/api/endpoints";
import { endOfDayIso, formatDate, formatMoney, startOfDayIso } from "@/lib/format";

type ExpensesSearch = {
  q?: string | undefined;
  branch?: number | undefined;
  group?: number | undefined;
  category?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page?: number | undefined;
};
export const Route = createFileRoute("/_app/expenses/")({
  validateSearch: (raw: Record<string, unknown>): ExpensesSearch => ({
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
    branch: Number(raw["branch"]) > 0 ? Number(raw["branch"]) : undefined,
    group: Number(raw["group"]) > 0 ? Number(raw["group"]) : undefined,
    category: Number(raw["category"]) > 0 ? Number(raw["category"]) : undefined,
    from: typeof raw["from"] === "string" && raw["from"] ? raw["from"] : undefined,
    to: typeof raw["to"] === "string" && raw["to"] ? raw["to"] : undefined,
    page: Math.max(1, Number(raw["page"]) || 1),
  }),
  component: ExpensesRoute,
});
function ExpensesRoute() {
  return (
    <RequirePermission permission={TAB.expenses}>
      <ExpensesScreen />
    </RequirePermission>
  );
}
function ExpensesScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const filters = Route.useSearch();
  const routeNavigate = Route.useNavigate();
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
        page: resetPage ? 1 : (patch.page ?? previous.page),
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
    <div className="space-y-6">
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.subtitle")}
        actions={
          can(PERM.expenseCreate) && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" />
              {t("expenses.newExpense")}
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
                placeholder={t("expenses.searchPlaceholder")}
                className="min-w-56"
              />
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
              <AppSelect
                value={filters.group ?? ""}
                onChange={(event) =>
                  setFilters({
                    group: event.target.value ? Number(event.target.value) : undefined,
                    category: undefined,
                  })
                }
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
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
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm disabled:opacity-50"
              >
                <option value="">{t("expenses.allLineCategories")}</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AppSelect>
              <input
                type="date"
                value={filters.from ?? ""}
                onChange={(event) => setFilters({ from: event.target.value || undefined })}
                aria-label={t("common.from")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              />
              <input
                type="date"
                value={filters.to ?? ""}
                onChange={(event) => setFilters({ to: event.target.value || undefined })}
                aria-label={t("common.to")}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              />
            </div>
          }
        />
        {expenses.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : expenses.isError ? (
          <div className="p-6">
            <ErrorState error={expenses.error} onRetry={() => void expenses.refetch()} />
          </div>
        ) : expenses.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={filtered} title={t("expenses.noExpenses")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("expenses.number")}</Th>
                  <Th>{t("expenses.headerCategory")}</Th>
                  <Th align="end">{t("common.total")}</Th>
                  <Th align="end">{t("common.paid")}</Th>
                  <Th align="end">{t("common.balance")}</Th>
                  <Th>{t("common.status")}</Th>
                  <Th>{t("expenses.period")}</Th>
                  <Th>{t("common.createdAt")}</Th>
                </tr>
              </thead>
              <tbody>
                {expenses.data.items.map((row) => {
                  const balance = Math.max(0, row.totalAmount - row.paidAmount);
                  const tone =
                    row.paymentStatus === "Fully Paid"
                      ? "success"
                      : row.paymentStatus === "Partially Paid"
                        ? "warning"
                        : "neutral";
                  return (
                    <tr key={row.id} className="hover:bg-muted/50">
                      <Td>
                        <Link
                          to="/expenses/$expenseId"
                          params={{ expenseId: String(row.id) }}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.expenseNumber ?? `#${row.id}`}
                        </Link>
                      </Td>
                      <Td>{row.categoryName ?? "—"}</Td>
                      <Td align="end" className="font-numeric">
                        {formatMoney(row.totalAmount, locale)}
                      </Td>
                      <Td align="end" className="font-numeric text-success">
                        {formatMoney(row.paidAmount, locale)}
                      </Td>
                      <Td align="end" className="font-numeric text-warning">
                        {formatMoney(balance, locale)}
                      </Td>
                      <Td>
                        <StatusBadge tone={tone}>
                          {t(
                            row.paymentStatus === "Fully Paid"
                              ? "expenses.fullyPaid"
                              : row.paymentStatus === "Partially Paid"
                                ? "expenses.partiallyPaid"
                                : "expenses.pending",
                          )}
                        </StatusBadge>
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
