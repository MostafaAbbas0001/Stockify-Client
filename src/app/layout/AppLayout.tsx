import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/app/layout/AppShell";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/shared/i18n";

export function AppLayout() {
  const { status, sessionExpired, dismissSessionExpired } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (status === "anonymous") {
      if (sessionExpired) {
        toast.error(t("profile.sessionExpired"));
        dismissSessionExpired();
      }
      navigate({ to: "/login", replace: true });
    }
  }, [status, sessionExpired, dismissSessionExpired, navigate, t]);

  if (status !== "authenticated") {
    return (
      <div className="grid min-h-svh place-items-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // POS needs the full viewport height without the padded page container.
  const flush = pathname.startsWith("/pos");

  return (
    <AppShell flush={flush}>
      <Outlet />
    </AppShell>
  );
}
