import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { salesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { SaleRow, SaleTypeValue } from "@/lib/api/types";
import { SaleType } from "@/lib/enums";
import { endOfDayIso, formatDate, formatMoney, startOfDayIso, toDateInput } from "@/lib/format";

type SalesSearch = {
  q?: string | undefined;
  type?: SaleTypeValue | undefined;
  active?: "yes" | "no" | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
};

export const Route = createFileRoute("/_app/sales/")({
  validateSearch: (raw: Record<string, unknown>): SalesSearch => ({
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
    type:
      Number(raw["type"]) === 1 || Number(raw["type"]) === 2
        ? (Number(raw["type"]) as SaleTypeValue)
        : undefined,
    active: raw["active"] === "yes" || raw["active"] === "no" ? raw["active"] : undefined,
    from: typeof raw["from"] === "string" && raw["from"] ? raw["from"] : undefined,
    to: typeof raw["to"] === "string" && raw["to"] ? raw["to"] : undefined,
    page: Math.max(1, Number(raw["page"]) || 1),
  }),
  component: SalesRoute,
});

function SalesRoute() {
  return (
    <RequirePermission permission={TAB.sales}>
      <SalesScreen />
    </RequirePermission>
  );
}

function saleTypeOf(row: SaleRow): SaleTypeValue {
  return row.type === "Percentage" || row.type === 1 ? 1 : 2;
}

function SalesScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<SaleTypeValue>(SaleType.Percentage);
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SaleRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setFilters = (patch: Partial<SalesSearch>, resetPage = true) =>
    void navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? previous.page),
      }),
      replace: true,
    });

  const sales = useQuery({
    queryKey: ["sales", filters],
    queryFn: () =>
      salesApi.list({
        search: filters.q,
        type: filters.type,
        isActive: filters.active ? filters.active === "yes" : undefined,
        startDate: filters.from ? startOfDayIso(filters.from) : undefined,
        endDate: filters.to ? endOfDayIso(filters.to) : undefined,
        page: filters.page,
      }),
    placeholderData: keepPreviousData,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        type,
        value: Number(value),
        startDate: startOfDayIso(startDate),
        endDate: endOfDayIso(endDate),
      };
      return editing ? salesApi.update(editing.id, body) : salesApi.create(body);
    },
    onSuccess: () => {
      toast.success(t(editing ? "sales.updated" : "sales.created"));
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      setFormOpen(false);
    },
    onError: (error) => setFormError(isApiError(error) ? error.message : (error as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => salesApi.remove(id),
    onSuccess: () => {
      toast.success(t("sales.deleted"));
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      setDeleting(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  const openForm = (row: SaleRow | null) => {
    const today = toDateInput(new Date());
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setEditing(row);
    setName(row?.name ?? "");
    setType(row ? saleTypeOf(row) : SaleType.Percentage);
    setValue(row ? String(row.value) : "");
    setStartDate(row?.startDate ? toDateInput(new Date(row.startDate)) : today);
    setEndDate(row?.endDate ? toDateInput(new Date(row.endDate)) : toDateInput(nextMonth));
    setFormError(null);
    setFormOpen(true);
  };

  const filtered = Boolean(
    filters.q || filters.type || filters.active || filters.from || filters.to,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("sales.title")}
        description={t("sales.subtitle")}
        actions={
          can(PERM.saleCreate) && (
            <button
              type="button"
              onClick={() => openForm(null)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" />
              {t("sales.newSale")}
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
                placeholder={t("sales.searchPlaceholder")}
                className="min-w-56"
              />
              <AppSelect
                value={filters.type ?? ""}
                onChange={(event) =>
                  setFilters({
                    type: event.target.value
                      ? (Number(event.target.value) as SaleTypeValue)
                      : undefined,
                  })
                }
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">{t("common.all")}</option>
                <option value="1">{t("sales.percentage")}</option>
                <option value="2">{t("sales.fixedAmount")}</option>
              </AppSelect>
              <AppSelect
                value={filters.active ?? ""}
                onChange={(event) =>
                  setFilters({
                    active:
                      event.target.value === "yes" || event.target.value === "no"
                        ? event.target.value
                        : undefined,
                  })
                }
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">{t("common.all")}</option>
                <option value="yes">{t("sales.active")}</option>
                <option value="no">{t("sales.inactive")}</option>
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
        {sales.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : sales.isError ? (
          <div className="p-6">
            <ErrorState error={sales.error} onRetry={() => void sales.refetch()} />
          </div>
        ) : sales.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={filtered} title={t("sales.noSales")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th>{t("sales.type")}</Th>
                  <Th align="end">{t("sales.value")}</Th>
                  <Th>{t("sales.schedule")}</Th>
                  <Th>{t("common.status")}</Th>
                  <Th align="end">{t("sales.variants")}</Th>
                  <Th align="end">{t("common.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {sales.data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <Td className="font-medium">{row.name}</Td>
                    <Td>{t(saleTypeOf(row) === 1 ? "sales.percentage" : "sales.fixedAmount")}</Td>
                    <Td align="end" className="font-numeric">
                      {saleTypeOf(row) === 1 ? `${row.value}%` : formatMoney(row.value, locale)}
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap">
                        {formatDate(row.startDate, locale)} — {formatDate(row.endDate, locale)}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge tone={row.isActiveNow ? "success" : "neutral"}>
                        {t(row.isActiveNow ? "sales.active" : "sales.inactive")}
                      </StatusBadge>
                    </Td>
                    <Td align="end">{row.variantCount}</Td>
                    <Td align="end">
                      <div className="flex justify-end gap-1">
                        {can(PERM.saleUpdate) && (
                          <button
                            type="button"
                            aria-label={t("common.edit")}
                            onClick={() => openForm(row)}
                            className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {can(PERM.saleDelete) && (
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
              page={sales.data.page}
              totalPages={sales.data.totalPages}
              totalCount={sales.data.totalCount}
              onPageChange={(page) => setFilters({ page }, false)}
            />
          </>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const numeric = Number(value);
              if (
                !name.trim() ||
                !startDate ||
                !endDate ||
                !Number.isFinite(numeric) ||
                numeric <= 0 ||
                endDate < startDate ||
                (type === SaleType.Percentage && numeric > 100)
              ) {
                setFormError(t("sales.invalid"));
                return;
              }
              setFormError(null);
              save.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t(editing ? "sales.editSale" : "sales.newSale")}</DialogTitle>
              <DialogDescription>{t("sales.formHint")}</DialogDescription>
            </DialogHeader>
            {formError && (
              <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-medium">{t("common.name")}</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium">{t("sales.type")}</span>
                <AppSelect
                  value={type}
                  onChange={(event) => setType(Number(event.target.value) as SaleTypeValue)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="1">{t("sales.percentage")}</option>
                  <option value="2">{t("sales.fixedAmount")}</option>
                </AppSelect>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium">{t("sales.value")}</span>
                <input
                  type="number"
                  min="0.01"
                  max={type === 1 ? 100 : undefined}
                  step="0.01"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium">{t("common.from")}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium">{t("common.to")}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </label>
            </div>
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-10 rounded-lg border border-border px-4 text-sm"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={save.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                {t("common.save")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("sales.deleteTitle")}
        body={t("sales.deleteBody")}
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
