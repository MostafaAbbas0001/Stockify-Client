import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, KeyRound, Laptop, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { ErrorState } from "@/shared/components/DataStates";
import { Card, CardHeader, KeyValue, PageHeader } from "@/shared/components/Surface";
import { useTheme, type ThemeMode } from "@/shared/theme/ThemeProvider";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n, type Locale } from "@/shared/i18n";
import { usersApi } from "@/features/people/users/api";
import { isApiError } from "@/shared/api/errors";
import { loadSession } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field, FormError } from "@/shared/ui/field";

export function ProfileScreen() {
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
        email: account.data!.email,
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
      <PageHeader title={t("profile.title")} description={t("profile.subtitle")} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("profile.account")} />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <IconValue icon={UserRound} label={t("users.username")} value={user?.username ?? "—"} />
            <IconValue icon={Mail} label={t("users.email")} value={user?.email ?? "—"} />
            <IconValue
              icon={Building2}
              label={t("common.company")}
              value={user?.tenantName ?? "—"}
            />
            <IconValue icon={ShieldCheck} label={t("common.role")} value={user?.roleName ?? "—"} />
            <IconValue icon={Laptop} label={t("common.branch")} value={user?.branchName ?? "—"} />
          </div>
        </Card>
        <Card>
          <CardHeader title={t("profile.preferences")} />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label={t("common.language")}>
              <AppSelect
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                className="w-full"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </AppSelect>
            </Field>
            <Field label={t("common.theme")}>
              <AppSelect
                value={mode}
                onChange={(event) => setMode(event.target.value as ThemeMode)}
                className="w-full"
              >
                <option value="system">{t("common.themeSystem")}</option>
                <option value="light">{t("common.themeLight")}</option>
                <option value="dark">{t("common.themeDark")}</option>
              </AppSelect>
            </Field>
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
                className="space-y-4 p-4"
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
                <FormError>{error}</FormError>
                <Field label={t("profile.newPassword")}>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <Field label={t("profile.confirmPassword")}>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </Field>
                <Button
                  type="submit"
                  loading={changePassword.isPending}
                  disabled={account.isPending}
                  className="w-full sm:w-auto"
                >
                  {!changePassword.isPending && <KeyRound className="size-4" />}
                  {t("profile.updatePassword")}
                </Button>
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
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
