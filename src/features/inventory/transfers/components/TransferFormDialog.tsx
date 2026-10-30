import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { FormDialog } from "@/shared/components/FormDialog";
import { VariantPicker } from "@/features/inventory/stock/components/VariantPicker";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { stockTransfersApi } from "@/features/inventory/transfers/api";
import { isApiError } from "@/shared/api/errors";
import type { ProductVariantRow } from "@/features/catalog/products/types";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

type DraftLine = { variant: ProductVariantRow; quantity: string };

/** Requests a new transfer (Draft). Source branch may be decided at dispatch. */
export function TransferFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const branches = useQuery(branchesQuery());

  const [sourceBranchId, setSourceBranchId] = useState<number | null>(null);
  const [destinationBranchId, setDestinationBranchId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [picking, setPicking] = useState<ProductVariantRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      stockTransfersApi.create({
        sourceBranchId,
        destinationBranchId: destinationBranchId ?? 0,
        notes: notes.trim() || null,
        items: lines.map((line) => ({
          productVariantId: line.variant.id,
          quantity: Number(line.quantity) || 0,
        })),
      }),
    onSuccess: () => {
      toast.success(t("transfers.created"));
      void queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      onOpenChange(false);
    },
    onError: (error) => setFormError(isApiError(error) ? error.message : (error as Error).message),
  });

  const addLine = (variant: ProductVariantRow | null) => {
    if (!variant) return;
    setPicking(null);
    setLines((current) =>
      current.some((line) => line.variant.id === variant.id)
        ? current
        : [...current, { variant, quantity: "1" }],
    );
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      pending={create.isPending}
      title={t("transfers.requestTransfer")}
      size="2xl"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        if (!destinationBranchId) {
          setFormError(t("common.required"));
          return;
        }
        if (lines.length === 0 || lines.some((line) => !Number(line.quantity))) {
          setFormError(t("transfers.noSelection"));
          return;
        }
        if (sourceBranchId && sourceBranchId === destinationBranchId) {
          setFormError(t("transfers.sameBranch"));
          return;
        }
        create.mutate();
      }}
      actions={
        <>
          <Button type="button" onClick={() => onOpenChange(false)} variant="secondary">
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("transfers.requestTransfer")}
          </Button>
        </>
      }
    >
      {formError && <FormError>{formError}</FormError>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("transfers.source")}
          </span>
          <AppSelect
            value={sourceBranchId ?? ""}
            onChange={(event) =>
              setSourceBranchId(event.target.value ? Number(event.target.value) : null)
            }
            className="w-full"
          >
            <option value="">{t("transfers.sourceLater")}</option>
            {(branches.data ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </AppSelect>
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">
            {t("transfers.destination")}
          </span>
          <AppSelect
            value={destinationBranchId ?? ""}
            onChange={(event) =>
              setDestinationBranchId(event.target.value ? Number(event.target.value) : null)
            }
            className="w-full"
          >
            <option value="">{t("transfers.destination")}</option>
            {(branches.data ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </AppSelect>
        </label>
      </div>

      <div className="space-y-2 rounded-control border border-border p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">{t("transfers.items")}</span>
          <span className="text-xs text-muted-foreground">
            {t("transfers.itemCount", { count: lines.length })}
          </span>
        </div>

        <VariantPicker value={picking} onChange={addLine} label={t("transfers.addItem")} />

        {lines.length > 0 && (
          <ul className="space-y-2">
            {lines.map((line) => (
              <li
                key={line.variant.id}
                className="flex items-center gap-2 rounded-control border border-border bg-muted px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {line.variant.productName}
                  </p>
                  <p className="tabular-nums truncate text-xs text-muted-foreground">
                    {line.variant.sku}
                  </p>
                </div>
                <Input
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.variant.id === line.variant.id
                          ? { ...item, quantity: event.target.value.replace(/[^\d]/g, "") }
                          : item,
                      ),
                    )
                  }
                  aria-label={t("common.quantity")}
                  className="w-20 text-center"
                />
                <Button
                  type="button"
                  aria-label={t("common.remove")}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.variant.id !== line.variant.id),
                    )
                  }
                  variant="quiet-destructive"
                  size="icon-sm"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium text-foreground">
          {t("transfers.notes")}
        </span>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="w-full"
        />
      </label>
    </FormDialog>
  );
}
