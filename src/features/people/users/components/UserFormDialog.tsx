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
import { rolesQuery } from "@/features/people/users/queries";
import { branchesQuery } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { usersApi } from "@/features/people/users/api";
import { isApiError } from "@/shared/api/errors";
import type { UserRow } from "@/features/people/users/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

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
  const [email, setEmail] = useState(user?.email ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | null>(user?.roleId ?? null);
  const [branchId, setBranchId] = useState<number | null>(user?.branchId ?? null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      user
        ? usersApi.update(user.id, {
            email: email.trim(),
            username: username.trim(),
            password: password || null,
            roleId: roleId!,
            branchId: branchId!,
          })
        : usersApi.create({
            email: email.trim(),
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
          reason.fieldErrors?.["email"]?.[0] ??
            reason.fieldErrors?.["username"]?.[0] ??
            reason.fieldErrors?.["password"]?.[0] ??
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
            const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
            const passwordValid = user ? !password || password.length >= 8 : password.length >= 8;
            if (
              !emailValid ||
              username.trim().length < 3 ||
              !passwordValid ||
              !roleId ||
              !branchId
            ) {
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
          {error && <FormError>{error}</FormError>}
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("users.email")}
            </span>
            <Input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("users.username")}
            </span>
            <Input
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("users.password")}
            </span>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={user ? t("users.passwordOptional") : undefined}
              className="w-full"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">
                {t("users.role")}
              </span>
              <AppSelect
                value={roleId ?? ""}
                disabled={user?.isOwner === true}
                onChange={(event) =>
                  setRoleId(event.target.value ? Number(event.target.value) : null)
                }
                className="w-full"
              >
                <option value="">{t("users.selectRole")}</option>
                {(roles.data ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </AppSelect>
            </label>
            <label className="block space-y-1.5">
              <span className="block text-[13px] font-medium text-foreground">
                {t("common.branch")}
              </span>
              <AppSelect
                value={branchId ?? ""}
                onChange={(event) =>
                  setBranchId(event.target.value ? Number(event.target.value) : null)
                }
                className="w-full"
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
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)} variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={save.isPending || branches.isPending || roles.isPending}
              loading={save.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
