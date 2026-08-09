import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { AppSelect } from "@/components/common/AppSelect";
import { branchesQuery, rolesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { usersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { UserRow } from "@/lib/api/types";

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const branches = useQuery(branchesQuery());
  const roles = useQuery(rolesQuery());
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | null>(user?.roleId ?? null);
  const [branchId, setBranchId] = useState<number | null>(user?.branchId ?? null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      user
        ? usersApi.update(user.id, {
            username: username.trim(),
            password: password || null,
            roleId: roleId!,
            branchId: branchId!,
          })
        : usersApi.create({
            username: username.trim(),
            password,
            roleId: roleId!,
            branchId: branchId!,
          }),
    onSuccess: () => {
      toast.success(t(user ? "users.updated" : "users.created"));
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (reason) => {
      if (isApiError(reason)) {
        setError(
          reason.fieldErrors?.["Username"]?.[0] ??
            reason.fieldErrors?.["Password"]?.[0] ??
            reason.message,
        );
      } else setError((reason as Error).message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (username.trim().length < 3 || (!user && !password) || !roleId || !branchId) {
              setError(t("users.invalid"));
              return;
            }
            setError(null);
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(user ? "users.editUser" : "users.newUser")}</DialogTitle>
            <DialogDescription>{t(user ? "users.editHint" : "users.createHint")}</DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          <label className="block space-y-1">
            <span className="text-xs font-medium">{t("users.username")}</span>
            <input
              autoFocus
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">{t("users.password")}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={user ? t("users.passwordOptional") : undefined}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium">{t("users.role")}</span>
              <AppSelect
                value={roleId ?? ""}
                onChange={(event) =>
                  setRoleId(event.target.value ? Number(event.target.value) : null)
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("users.selectRole")}</option>
                {(roles.data ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </AppSelect>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium">{t("common.branch")}</span>
              <AppSelect
                value={branchId ?? ""}
                onChange={(event) =>
                  setBranchId(event.target.value ? Number(event.target.value) : null)
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("users.selectBranch")}</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </AppSelect>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-lg border border-border px-4 text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={save.isPending || branches.isPending || roles.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
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
