import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/no-access")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "No access — Stockify" },
      {
        name: "description",
        content: "This Stockify account has no permissions assigned yet.",
      },
      { property: "og:title", content: "No access — Stockify" },
      {
        property: "og:description",
        content: "Ask a Stockify administrator to grant permissions to this account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NoAccessPage,
});

function NoAccessPage() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative grid min-h-screen place-items-center bg-surface-sunken px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-warning">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-base font-semibold text-foreground">
          {t("common.accessDeniedTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.noPermissions")}</p>
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
          className="mt-5 h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("common.signOut")}
        </button>
      </div>
    </div>
  );
}
