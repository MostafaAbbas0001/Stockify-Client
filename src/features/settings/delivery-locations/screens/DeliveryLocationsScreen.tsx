import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { SearchInput } from "@/shared/components/SearchInput";
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
import {
  deliveryChargeKeys,
  deliveryChargesQuery,
} from "@/features/settings/delivery-locations/queries";
import { useI18n } from "@/shared/i18n";
import { deliveryChargesApi } from "@/features/settings/delivery-locations/api";
import { isApiError } from "@/shared/api/errors";
import type { DeliveryCharge } from "@/features/settings/delivery-locations/types";
import { formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

const routeApi = getRouteApi("/_app/delivery-charges/");

export function DeliveryLocationsScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const filters = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: deliveryChargeKeys.all });

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
    <div className="space-y-4">
      <PageHeader
        title={t("deliveryCharges.title")}
        description={t("deliveryCharges.subtitle")}
        actions={
          can(PERM.deliveryChargeCreate) && (
            <Button type="button" onClick={() => openForm(null)}>
              <Plus className="size-4" /> {t("deliveryCharges.newLocation")}
            </Button>
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
              className="md:w-64"
            />
          }
        />
        {charges.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : charges.isError ? (
          <div>
            <ErrorState error={charges.error} onRetry={() => void charges.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div>
            <EmptyState filtered={Boolean(filters.q)} title={t("deliveryCharges.noLocations")} />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{t("deliveryCharges.location")}</Th>
                <Th align="end" width="sm">
                  {t("deliveryCharges.fee")}
                </Th>
                <Th align="end" actions>
                  {t("common.actions")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  <Td className="font-medium">{row.locationName}</Td>
                  <Td align="end" className="tabular-nums">
                    {formatMoney(row.fee, locale)}
                  </Td>
                  <Td align="end">
                    <div className="flex justify-end gap-1">
                      {can(PERM.deliveryChargeUpdate) && (
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
                      {!row.isInStore && can(PERM.deliveryChargeDelete) && (
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
            {formError && <FormError>{formError}</FormError>}
            <label className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">
                {t("deliveryCharges.location")}
              </span>
              <Input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">
                {t("deliveryCharges.fee")}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                className="w-full"
              />
            </label>
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
