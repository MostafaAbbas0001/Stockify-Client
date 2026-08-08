import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/i18n";

/**
 * Pathless layout that gates every in-app screen behind a session and renders
 * the persistent application shell (sidebar + header) around every child route.
 * ssr:false because the session lives in browser storage.
 */
export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
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
      <div className="grid min-h-screen place-items-center bg-background">
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
