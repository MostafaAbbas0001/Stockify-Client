import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, SearchX } from "lucide-react";

import { useI18n } from "@/i18n";

export const Route = createFileRoute("/$")({
  component: NotFoundScreen,
});
function NotFoundScreen() {
  const { t } = useI18n();
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_38%)]" />
      <div className="relative max-w-md text-center">
        <SearchX className="mx-auto size-10 text-primary" />
        <p className="mt-5 font-numeric text-sm font-semibold text-primary">404</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("common.notFoundTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("common.notFoundBody")}
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/15"
        >
          <Home className="size-4" />
          {t("profile.backHome")}
        </Link>
      </div>
    </main>
  );
}
