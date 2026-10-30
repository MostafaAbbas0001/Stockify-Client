import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

import { useI18n } from "@/shared/i18n";
import { buttonVariants } from "@/shared/ui/variants";

export function NotFoundScreen() {
  const { t } = useI18n();
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <div className="max-w-md text-center">
        <p className="text-display font-semibold tabular-nums text-foreground">404</p>
        <h1 className="mt-3 text-subheading font-semibold text-foreground">
          {t("common.notFoundTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("common.notFoundBody")}</p>
        <Link to="/" className={buttonVariants({ className: "mt-7" })}>
          <Home className="size-4" />
          {t("profile.backHome")}
        </Link>
      </div>
    </main>
  );
}
