import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, UserRound } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { SearchInput } from "@/components/common/SearchInput";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { customersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            {creating ? t("customers.newCustomer") : t("pos.selectCustomer")}
          </h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

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
            className="space-y-3 overflow-y-auto p-4"
            noValidate
          >
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
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {create.isPending && <Loader2 className="size-4 animate-spin" />}
                {t("common.save")}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-2 border-b border-border p-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t("customers.searchPlaceholder")}
                autoFocus
              />
              {can(PERM.customerCreate) && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Plus className="size-3.5" />
                  {t("customers.newCustomer")}
                </button>
              )}
            </div>
            <div className="min-h-40 flex-1 overflow-y-auto p-2">
              {customers.isPending ? (
                <LoadingState />
              ) : customers.isError ? (
                <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
              ) : customers.data.items.length === 0 ? (
                <EmptyState filtered={search.length > 0} title={t("customers.noCustomers")} />
              ) : (
                <ul className="space-y-1">
                  {customers.data.items.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(customer)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors hover:bg-muted"
                      >
                        <UserRound className="size-5 shrink-0 text-primary" />
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
          </>
        )}
      </div>
    </div>
  );
}
