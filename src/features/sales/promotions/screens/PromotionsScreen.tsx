import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { Pagination } from "@/shared/components/Pagination";
import { SearchInput } from "@/shared/components/SearchInput";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/shared/i18n";
import { salesApi } from "@/features/sales/promotions/api";
import { isApiError } from "@/shared/api/errors";
import { SaleTypeCode } from "@/features/lookups/codes";
import { useLookups } from "@/features/lookups/useLookups";
import type { SaleRow } from "@/features/sales/promotions/types";
import {
  endOfDayIso,
  formatDate,
  formatMoney,
  startOfDayIso,
  toDateInput,
} from "@/shared/lib/format";
import type { SalesSearch } from "@/features/sales/promotions/search";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

const routeApi = getRouteApi("/_app/sales/");

export function PromotionsScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const filters = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [name, setName] = useState("");
  const lookups = useLookups();
  const saleTypes = lookups.list("saleTypes");
  const [saleTypeId, setSaleTypeId] = useState<number | null>(null);
  const saleType = saleTypes.find((item) => item.id === saleTypeId) ?? saleTypes[0];
  const isPercentage = saleType?.code === SaleTypeCode.Percentage;
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
        page: resetPage ? 1 : (patch.page ?? filters.page),
      }),
      replace: true,
    });

  const sales = useQuery({
    queryKey: ["sales", filters],
    queryFn: () =>
      salesApi.list({
        search: filters.q,
        saleTypeId: filters.type,
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
        saleTypeId: saleType?.id ?? 0,
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
    setSaleTypeId(row?.saleTypeId ?? null);
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
    <div className="space-y-4">
      <PageHeader
        title={t("sales.title")}
        description={t("sales.subtitle")}
        actions={
          can(PERM.saleCreate) && (
            <Button type="button" onClick={() => openForm(null)}>
              <Plus className="size-4" />
              {t("sales.newSale")}
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
                placeholder={t("sales.searchPlaceholder")}
              />
              <AppSelect
                value={filters.type ?? ""}
                onChange={(event) =>
                  setFilters({
                    type: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                aria-label={t("sales.type")}
                className="w-full md:w-44"
              >
                <option value="">{t("common.all")}</option>
                {saleTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {lookups.label("saleTypes", item)}
                  </option>
                ))}
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
                aria-label={t("common.status")}
                className="w-full md:w-44"
              >
                <option value="">{t("common.all")}</option>
                <option value="yes">{t("sales.active")}</option>
                <option value="no">{t("sales.inactive")}</option>
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
        {sales.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : sales.isError ? (
          <div>
            <ErrorState error={sales.error} onRetry={() => void sales.refetch()} />
          </div>
        ) : sales.data.items.length === 0 ? (
          <div>
            <EmptyState filtered={filtered} title={t("sales.noSales")} />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{t("common.name")}</Th>
                  <Th width="sm">{t("sales.type")}</Th>
                  <Th align="end" width="sm">
                    {t("sales.value")}
                  </Th>
                  <Th width="lg">{t("sales.schedule")}</Th>
                  <Th width="md">{t("common.status")}</Th>
                  <Th align="end" width="xs">
                    {t("sales.variants")}
                  </Th>
                  <Th align="end" actions>
                    {t("common.actions")}
                  </Th>
                </tr>
              </thead>
              <tbody>
                {sales.data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <Td className="font-medium">{row.name}</Td>
                    <Td>{lookups.labelOf("saleTypes", row.saleTypeCode)}</Td>
                    <Td align="end" className="tabular-nums">
                      {row.saleTypeCode === SaleTypeCode.Percentage
                        ? `${row.value}%`
                        : formatMoney(row.value, locale)}
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap">
                        {formatDate(row.startDate, locale)} – {formatDate(row.endDate, locale)}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge tone={row.isActiveNow ? "success" : "neutral"}>
                        {t(row.isActiveNow ? "sales.active" : "sales.inactive")}
                      </StatusBadge>
                    </Td>
                    <Td align="end" className="tabular-nums">
                      {row.variantCount}
                    </Td>
                    <Td align="end">
                      <div className="flex justify-end gap-1">
                        {can(PERM.saleUpdate) && (
                          <Button
                            type="button"
                            aria-label={t("common.edit")}
                            onClick={() => openForm(row)}
                            variant="quiet"
                            size="icon-sm"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {can(PERM.saleDelete) && (
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
                !saleType ||
                (isPercentage && numeric > 100)
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
            {formError && <FormError>{formError}</FormError>}
            <label className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">
                {t("common.name")}
              </span>
              <Input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-medium text-foreground">
                  {t("sales.type")}
                </span>
                <AppSelect
                  value={saleType?.id ?? ""}
                  onChange={(event) => setSaleTypeId(Number(event.target.value))}
                  className="w-full"
                >
                  {saleTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {lookups.label("saleTypes", item)}
                    </option>
                  ))}
                </AppSelect>
              </label>
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-medium text-foreground">
                  {t("sales.value")}
                </span>
                <Input
                  type="number"
                  min="0.01"
                  max={isPercentage ? 100 : undefined}
                  step="0.01"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="w-full"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-medium text-foreground">
                  {t("common.from")}
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-medium text-foreground">
                  {t("common.to")}
                </span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full"
                />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setFormOpen(false)} variant="secondary">
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={save.isPending}>
                {t("common.save")}
              </Button>
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
