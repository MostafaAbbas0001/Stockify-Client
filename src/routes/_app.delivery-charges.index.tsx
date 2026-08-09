import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { RequirePermission } from "@/components/common/RequirePermission";
import { SearchInput } from "@/components/common/SearchInput";
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
import { deliveryChargesQuery, referenceKeys } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { deliveryChargesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { DeliveryCharge } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/delivery-charges/")({
  validateSearch: (raw: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
  }),
  component: DeliveryChargesRoute,
});

function DeliveryChargesRoute() {
  return (
    <RequirePermission permission={TAB.delivery}>
      <DeliveryChargesScreen />
    </RequirePermission>
  );
}

function DeliveryChargesScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState<DeliveryCharge | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DeliveryCharge | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const charges = useQuery(deliveryChargesQuery());
  const rows = useMemo(() => {
    const term = (filters.q ?? "").trim().toLowerCase();
    return term
      ? (charges.data ?? []).filter((row) => row.locationName.toLowerCase().includes(term))
      : (charges.data ?? []);
  }, [charges.data, filters.q]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: referenceKeys.deliveryCharges });

  const save = useMutation({
    mutationFn: () => {
      const body = { locationName: name.trim(), fee: Number(fee) };
      return editing
        ? deliveryChargesApi.update(editing.id, body)
        : deliveryChargesApi.create(body);
    },
    onSuccess: () => {
      toast.success(t(editing ? "deliveryCharges.updated" : "deliveryCharges.created"));
      void invalidate();
      setFormOpen(false);
    },
    onError: (error) => setFormError(isApiError(error) ? error.message : (error as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deliveryChargesApi.remove(id),
    onSuccess: () => {
      toast.success(t("deliveryCharges.deleted"));
      void invalidate();
      setDeleting(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  const openForm = (row: DeliveryCharge | null) => {
    setEditing(row);
    setName(row?.locationName ?? "");
    setFee(row ? String(row.fee) : "0");
    setFormError(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("deliveryCharges.title")}
        description={t("deliveryCharges.subtitle")}
        actions={
          can(PERM.deliveryChargeCreate) && (
            <button
              type="button"
              onClick={() => openForm(null)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" /> {t("deliveryCharges.newLocation")}
            </button>
          )
        }
      />

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <SearchInput
              value={filters.q ?? ""}
              onChange={(q) => void navigate({ search: { q: q || undefined }, replace: true })}
              placeholder={t("deliveryCharges.searchPlaceholder")}
              className="min-w-64"
            />
          }
        />
        {charges.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : charges.isError ? (
          <div className="p-6">
            <ErrorState error={charges.error} onRetry={() => void charges.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={Boolean(filters.q)} title={t("deliveryCharges.noLocations")} />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{t("deliveryCharges.location")}</Th>
                <Th align="end">{t("deliveryCharges.fee")}</Th>
                <Th align="end">{t("common.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  <Td className="font-medium">{row.locationName}</Td>
                  <Td align="end" className="font-numeric">
                    {formatMoney(row.fee, locale)}
                  </Td>
                  <Td align="end">
                    <div className="flex justify-end gap-1">
                      {can(PERM.deliveryChargeUpdate) && (
                        <button
                          type="button"
                          aria-label={t("common.edit")}
                          onClick={() => openForm(row)}
                          className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      {row.id !== 1 && can(PERM.deliveryChargeDelete) && (
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
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setFormError(null);
              if (!name.trim() || !Number.isFinite(Number(fee)) || Number(fee) < 0) {
                setFormError(t("deliveryCharges.invalid"));
                return;
              }
              save.mutate();
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>
                {t(editing ? "deliveryCharges.editLocation" : "deliveryCharges.newLocation")}
              </DialogTitle>
              <DialogDescription>{t("deliveryCharges.formHint")}</DialogDescription>
            </DialogHeader>
            {formError && (
              <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-medium">{t("deliveryCharges.location")}</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">{t("deliveryCharges.fee")}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              />
            </label>
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-10 rounded-lg border border-border px-4 text-sm font-medium"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={save.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
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
        title={t("deliveryCharges.deleteTitle")}
        body={t("deliveryCharges.deleteBody")}
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
