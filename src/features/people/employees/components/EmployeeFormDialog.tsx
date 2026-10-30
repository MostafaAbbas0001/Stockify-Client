import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { AppSelect } from "@/shared/components/AppSelect";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { employeesApi } from "@/features/people/employees/api";
import { isApiError } from "@/shared/api/errors";
import type { EmployeeRow } from "@/features/people/employees/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { CheckboxField, FormError } from "@/shared/ui/field";

/** Create / edit dialog for employee records. */
export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeRow | null;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const branches = useQuery({ ...branchesQuery(), enabled: open });

  const [form, setForm] = useState({
    name: employee?.name ?? "",
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
    address: employee?.address ?? "",
  });
  const [branchId, setBranchId] = useState<number | null>(employee?.branchId ?? null);
  const [isSale, setIsSale] = useState(employee?.isSale ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, branchId: branchId ?? 0, isSale };
      return employee ? employeesApi.update(employee.id, payload) : employeesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(employee ? t("employees.updated") : t("employees.created"));
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
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
            if (!branchId) {
              setFieldErrors({ branchId: t("employees.branchRequired") });
              return;
            }
            save.mutate();
          }}
          className="space-y-3"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>
              {employee ? t("employees.editEmployee") : t("employees.newEmployee")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {employee ? t("employees.editEmployee") : t("employees.newEmployee")}
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

          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("common.branch")}
            </span>
            <AppSelect
              value={branchId ?? ""}
              onChange={(event) => setBranchId(Number(event.target.value) || null)}
              className="w-full"
            >
              <option value="">{t("common.none")}</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AppSelect>
            {fieldErrors["branchId"] && (
              <span className="block text-xs text-destructive">{fieldErrors["branchId"]}</span>
            )}
          </label>

          <CheckboxField
            checked={isSale}
            onChange={setIsSale}
            label={t("employees.isSalesperson")}
          />

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
