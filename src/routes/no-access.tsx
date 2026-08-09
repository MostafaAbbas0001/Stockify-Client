import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/no-access")({
  component: NoAccessPage,
});

function NoAccessPage() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,color-mix(in_oklab,var(--warning)_9%,transparent),transparent_40%)]" />
      <div className="relative max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-xl shadow-foreground/[0.04] sm:p-9">
        <ShieldAlert className="mx-auto size-9 text-warning" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
          {t("common.accessDeniedTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("auth.noPermissions")}
        </p>
        {user && (
          <p className="mt-3 text-xs text-muted-foreground">
            {user.username}
            {user.roleName ? ` · ${user.roleName}` : ""}
          </p>
        )}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login", replace: true });
          }}
          className="mt-6 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/15 transition-colors hover:bg-primary/90"
        >
          {t("common.signOut")}
        </button>
      </div>
    </main>
  );
}
