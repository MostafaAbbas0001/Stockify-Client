import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/shared/components/DataStates";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useI18n } from "@/shared/i18n";
import { usersApi } from "@/features/people/users/api";
import { isApiError } from "@/shared/api/errors";
import type { UserPermissionsResponse, UserRow } from "@/features/people/users/types";
import { Button } from "@/shared/ui/button";
import { FormError } from "@/shared/ui/field";

export function UserPermissionsDialog({
  user,
  onOpenChange,
}: {
  user: UserRow;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const permissions = useQuery({
    queryKey: ["users", user.id, "permissions"],
    queryFn: () => usersApi.permissions(user.id),
  });

  useEffect(() => {
    if (!permissions.data) return;
    setValues(
      Object.fromEntries(
        permissions.data.permissions.map((permission) => [permission.id, permission.effective]),
      ),
    );
  }, [permissions.data]);

  const groups = useMemo(() => {
    const map = new Map<string, UserPermissionsResponse["permissions"]>();
    for (const permission of permissions.data?.permissions ?? []) {
      const group =
        permission.key.split(".")[0] || permission.target || t("users.otherPermissions");
      map.set(group, [...(map.get(group) ?? []), permission]);
    }
    return [...map.entries()];
  }, [permissions.data, t]);

  const save = useMutation({
    mutationFn: () =>
      usersApi.updatePermissions(
        user.id,
        (permissions.data?.permissions ?? []).map((permission) => ({
          permissionId: permission.id,
          isActive: values[permission.id] ?? permission.effective,
        })),
      ),
    onSuccess: () => {
      toast.success(t("users.permissionsUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["users", user.id, "permissions"] });
      onOpenChange(false);
    },
    onError: (reason) => setError(isApiError(reason) ? reason.message : (reason as Error).message),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="3xl">
        <DialogHeader>
          <DialogTitle>{t("users.permissionsFor", { name: user.username })}</DialogTitle>
          <DialogDescription>{t("users.permissionsHint")}</DialogDescription>
        </DialogHeader>
        {permissions.isPending ? (
          <LoadingState />
        ) : permissions.isError ? (
          <ErrorState error={permissions.error} onRetry={() => void permissions.refetch()} />
        ) : (
          <div className="space-y-4">
            <FormError>{error}</FormError>
            <p className="rounded-control bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
              {t("users.effectiveRole")}:{" "}
              <span className="font-medium text-foreground">{permissions.data.roleName}</span>
            </p>
            {groups.map(([group, items]) => (
              <section key={group} className="overflow-hidden rounded-control border border-border">
                <h3 className="border-b border-border bg-muted/50 px-4 py-2.5 text-[13px] font-medium text-foreground">
                  {group}
                </h3>
                <div className="divide-y divide-border">
                  {items.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block break-all text-[13px] font-medium text-foreground">
                          {permission.key}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          <StatusBadge tone={permission.roleDefault ? "info" : "neutral"}>
                            {permission.roleDefault
                              ? t("users.roleDefaultOn")
                              : t("users.roleDefaultOff")}
                          </StatusBadge>
                          {permission.userOverride !== null && (
                            <StatusBadge tone="warning">{t("users.explicitOverride")}</StatusBadge>
                          )}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={values[permission.id] ?? permission.effective}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [permission.id]: event.target.checked,
                          }))
                        }
                        className="size-4 shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)} variant="secondary">
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={!permissions.data}
            loading={save.isPending}
          >
            {t("users.savePermissions")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
