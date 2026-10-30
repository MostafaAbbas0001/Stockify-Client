import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { BrandLogo } from "@/shared/components/BrandMark";
import { Card } from "@/shared/components/Surface";
import { useI18n } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

export function NoAccessScreen() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <BrandLogo />
      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        <span className="mx-auto grid size-10 place-items-center rounded-control bg-muted text-muted-foreground">
          <Lock className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 text-heading-sm font-semibold text-foreground">
          {t("common.accessDeniedTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.noPermissions")}</p>
        {user && (
          <dl className="mt-5 space-y-1 rounded-control bg-muted px-4 py-3 text-start text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("common.email")}</dt>
              <dd className="truncate text-foreground">{user.email ?? user.username}</dd>
            </div>
            {user.roleName && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("common.role")}</dt>
                <dd className="truncate text-foreground">{user.roleName}</dd>
              </div>
            )}
          </dl>
        )}
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login", replace: true });
          }}
        >
          {t("common.signOut")}
        </Button>
      </Card>
    </main>
  );
}
