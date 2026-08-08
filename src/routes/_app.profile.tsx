import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Laptop, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/DataStates";
import { Card, CardHeader, KeyValue } from "@/components/common/Surface";
import { useTheme, type ThemeMode } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n, type Locale } from "@/i18n";
import { usersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { loadSession } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — Stockify" },
      {
        name: "description",
        content: "Manage your Stockify password, language, theme and session preferences.",
      },
      { property: "og:title", content: "Profile & Settings — Stockify" },
      { property: "og:description", content: "Personal Stockify workspace settings." },
    ],
  }),
  component: ProfileScreen,
});
function ProfileScreen() {
  const { user, can } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { mode, setMode } = useTheme();
  const queryClient = useQueryClient();
  const userId = Number(user?.id);
  const account = useQuery({
    queryKey: ["users", userId, "profile"],
    queryFn: () => usersApi.get(userId),
    enabled: Number.isInteger(userId) && userId > 0 && can(PERM.usersView),
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const changePassword = useMutation({
    mutationFn: () =>
      usersApi.update(userId, {
        username: account.data!.username,
        roleId: account.data!.roleId,
        branchId: account.data!.branchId,
        password,
      }),
    onSuccess: () => {
      toast.success(t("profile.passwordUpdated"));
      setPassword("");
      setConfirmPassword("");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (reason) => setError(isApiError(reason) ? reason.message : (reason as Error).message),
  });
  const session = loadSession();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("profile.account")} />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <IconValue icon={UserRound} label={t("users.username")} value={user?.username ?? "—"} />
            <IconValue icon={ShieldCheck} label={t("common.role")} value={user?.roleName ?? "—"} />
            <IconValue icon={Laptop} label={t("common.branch")} value={user?.branchName ?? "—"} />
          </div>
        </Card>
        <Card>
          <CardHeader title={t("profile.preferences")} />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium">{t("common.language")}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium">{t("common.theme")}</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as ThemeMode)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="system">{t("common.themeSystem")}</option>
                <option value="light">{t("common.themeLight")}</option>
                <option value="dark">{t("common.themeDark")}</option>
              </select>
            </label>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("profile.session")} />
          <dl className="grid gap-4 p-4 sm:grid-cols-2">
            <KeyValue
              label={t("profile.device")}
              value={typeof navigator === "undefined" ? "—" : navigator.userAgent}
            />
            <KeyValue
              label={t("profile.expires")}
              value={formatDateTime(session?.expiresAt, locale)}
            />
          </dl>
        </Card>
        <Card>
          <CardHeader
            title={t("profile.changePassword")}
            description={
              can(PERM.usersUpdate) ? t("profile.passwordHint") : t("profile.passwordUnavailable")
            }
          />
          {can(PERM.usersUpdate) ? (
            account.isError ? (
              <div className="p-4">
                <ErrorState error={account.error} onRetry={() => void account.refetch()} />
              </div>
            ) : (
              <form
                className="space-y-3 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (password.length < 6 || password !== confirmPassword || !account.data) {
                    setError(t("profile.invalidPassword"));
                    return;
                  }
                  setError(null);
                  changePassword.mutate();
                }}
              >
                {error && (
                  <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                )}
                <label className="block space-y-1">
                  <span className="text-xs font-medium">{t("profile.newPassword")}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium">{t("profile.confirmPassword")}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={changePassword.isPending || account.isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {changePassword.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  {t("profile.updatePassword")}
                </button>
              </form>
            )
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t("profile.contactAdmin")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
function IconValue({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
