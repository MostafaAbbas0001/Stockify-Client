import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { customersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";

type FormState = { name: string; phone: string; email: string; address: string };

/** Create / edit dialog for customer records. */
export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      customer ? customersApi.update(customer.id, form) : customersApi.create(form),
    onSuccess: () => {
      toast.success(customer ? t("customers.updated") : t("customers.created"));
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (isApiError(error) && error.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) mapped[key.charAt(0).toLowerCase() + key.slice(1)] = messages[0];
        }
        setFieldErrors(mapped);
        setFormError(null);
      } else {
        setFormError(isApiError(error) ? error.message : (error as Error).message);
      }
    },
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setFieldErrors({});
            setFormError(null);
            if (!form.name.trim()) {
              setFieldErrors({ name: t("customers.nameRequired") });
              return;
            }
            save.mutate();
          }}
          className="space-y-3"
          noValidate
        >
          <DialogHeader>
            <DialogTitle className="text-base">
              {customer ? t("customers.editCustomer") : t("customers.newCustomer")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {customer ? t("customers.editCustomer") : t("customers.newCustomer")}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          )}

          {(
            [
              ["name", t("common.name")],
              ["phone", t("common.phone")],
              ["email", t("common.email")],
              ["address", t("common.address")],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="block space-y-1">
              <span className="text-xs font-medium text-foreground">{label}</span>
              <input
                value={form[field]}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              />
              {fieldErrors[field] && (
                <span className="block text-[0.7rem] text-destructive">{fieldErrors[field]}</span>
              )}
            </label>
          ))}

          <DialogFooter className="gap-2 pt-1 sm:space-x-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("common.save")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
