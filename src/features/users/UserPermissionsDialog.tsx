import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/common/DataStates";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { usersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { UserPermissionsResponse, UserRow } from "@/lib/api/types";

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
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
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
            {error && (
              <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">{error}</p>
            )}
            <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs text-muted-foreground">
              {t("users.effectiveRole")}:{" "}
              <strong className="text-foreground">{permissions.data.roleName}</strong>
            </div>
            {groups.map(([group, items]) => (
              <section key={group} className="rounded-lg border border-border">
                <h3 className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </h3>
                <div className="divide-y divide-border">
                  {items.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-medium text-foreground">
                          {permission.key}
                        </span>
                        <span className="mt-1 flex gap-1">
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
                        className="size-4 shrink-0 accent-[var(--primary)]"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg border border-border px-4 text-sm"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !permissions.data}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("users.savePermissions")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
