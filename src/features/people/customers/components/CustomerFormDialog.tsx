import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useI18n } from "@/shared/i18n";
import { customersApi } from "@/features/people/customers/api";
import { isApiError } from "@/shared/api/errors";
import type { Customer } from "@/features/people/customers/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

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
      <DialogContent size="md">
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
            <DialogTitle>
              {customer ? t("customers.editCustomer") : t("customers.newCustomer")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {customer ? t("customers.editCustomer") : t("customers.newCustomer")}
            </DialogDescription>
          </DialogHeader>

          {formError && <FormError>{formError}</FormError>}

          {(
            [
              ["name", t("common.name")],
              ["phone", t("common.phone")],
              ["email", t("common.email")],
              ["address", t("common.address")],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">{label}</span>
              <Input
                value={form[field]}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                className="w-full"
              />
              {fieldErrors[field] && (
                <span className="block text-xs text-destructive">{fieldErrors[field]}</span>
              )}
            </label>
          ))}

          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)} variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
