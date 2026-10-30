import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserRound } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { SearchInput } from "@/shared/components/SearchInput";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/shared/i18n";
import { customersApi } from "@/features/people/customers/api";
import { isApiError } from "@/shared/api/errors";
import type { Customer } from "@/features/people/customers/types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FormError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

/** Search-and-select customer dialog with inline creation for the POS flow. */
export function CustomerPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
}) {
  const { t } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers", { search, page: 1 }],
    queryFn: () => customersApi.list({ search: search || undefined, page: 1 }),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => customersApi.create(form),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCreating(false);
      setForm({ name: "", phone: "", address: "", email: "" });
      onSelect(customer);
    },
    onError: (error) => {
      if (isApiError(error) && error.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) mapped[key] = messages[0];
        }
        setFieldErrors(mapped);
        setFormError(null);
      } else {
        setFormError(isApiError(error) ? error.message : (error as Error).message);
      }
    },
  });

  const title = creating ? t("customers.newCustomer") : t("pos.selectCustomer");

  return (
    <Dialog open={open} onOpenChange={(next) => !create.isPending && onOpenChange(next)}>
      <DialogContent size="md" className="sm:max-h-[min(40rem,calc(100dvh-4rem))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        {creating ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setFieldErrors({});
              setFormError(null);
              if (!form.name.trim()) {
                setFieldErrors({ name: t("customers.nameRequired") });
                return;
              }
              create.mutate();
            }}
            className="space-y-4"
            noValidate
          >
            <FormError>{formError}</FormError>
            {(
              [
                ["name", t("common.name")],
                ["phone", t("common.phone")],
                ["email", t("common.email")],
                ["address", t("common.address")],
              ] as const
            ).map(([field, label]) => (
              <Field key={field} label={label} error={fieldErrors[field]}>
                <Input
                  value={form[field]}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  aria-invalid={fieldErrors[field] ? true : undefined}
                />
              </Field>
            ))}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setCreating(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={create.isPending}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t("customers.searchPlaceholder")}
                autoFocus
                className="flex-1"
              />
              {can(PERM.customerCreate) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCreating(true)}
                  aria-label={t("customers.newCustomer")}
                  title={t("customers.newCustomer")}
                >
                  <Plus className="size-4" />
                </Button>
              )}
            </div>
            <div className="-mx-2 min-h-48">
              {customers.isPending ? (
                <LoadingState />
              ) : customers.isError ? (
                <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
              ) : customers.data.items.length === 0 ? (
                <EmptyState filtered={search.length > 0} title={t("customers.noCustomers")} />
              ) : (
                <ul className="space-y-0.5">
                  {customers.data.items.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(customer)}
                        className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 py-2 text-start transition-colors hover:bg-muted focus-visible:bg-muted"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                          <UserRound className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {customer.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {customer.phone || customer.email || customer.address || "—"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
