import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, SearchX } from "lucide-react";

import { useI18n } from "@/i18n";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page Not Found — Stockify" },
      { name: "description", content: "The requested Stockify page could not be found." },
      { property: "og:title", content: "Page Not Found — Stockify" },
      { property: "og:description", content: "Return to the Stockify workspace." },
    ],
  }),
  component: NotFoundScreen,
});
function NotFoundScreen() {
  const { t } = useI18n();
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-6" />
        </span>
        <p className="mt-5 font-numeric text-sm font-semibold text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold">{t("common.notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.notFoundBody")}</p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Home className="size-4" />
          {t("profile.backHome")}
        </Link>
      </div>
    </main>
  );
}
