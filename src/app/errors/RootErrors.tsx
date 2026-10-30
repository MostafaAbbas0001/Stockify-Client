import { Link, useRouter } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

import { isApiError } from "@/shared/api/errors";
import { I18nProvider, useI18n } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { Button } from "@/shared/ui/button";
import { buttonVariants } from "@/shared/ui/variants";

/** Root-level 404, rendered outside the app providers. */
export function RootNotFound() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <LocalizedNotFound />
      </I18nProvider>
    </ThemeProvider>
  );
}

function LocalizedNotFound() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <div className="max-w-md text-center">
        <p className="text-display font-semibold tabular-nums text-foreground">404</p>
        <h1 className="mt-3 text-subheading font-semibold text-foreground">
          {t("common.notFoundTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("common.notFoundBody")}</p>
        <Link to="/" className={buttonVariants({ className: "mt-7" })}>
          {t("profile.backHome")}
        </Link>
      </div>
    </div>
  );
}

/** Root-level error boundary, rendered outside the app providers. */
export function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <LocalizedError error={error} reset={reset} />
      </I18nProvider>
    </ThemeProvider>
  );
}

function LocalizedError({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const traceId = isApiError(error) ? error.traceId : undefined;
  return (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-control bg-card text-destructive shadow-card">
          <AlertCircle className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 text-subheading font-semibold text-foreground">
          {t("common.serverErrorTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isApiError(error) ? error.message : t("common.serverErrorBody")}
        </p>
        {traceId && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 max-w-full"
            title={t("common.copy")}
            onClick={() => {
              void navigator.clipboard.writeText(traceId);
              setCopied(true);
            }}
          >
            <span className="truncate">
              {t("common.traceId")}: <span className="font-mono">{traceId}</span>
            </span>
            <span className="shrink-0">{t(copied ? "common.copied" : "common.copy")}</span>
          </Button>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            {t("common.retry")}
          </Button>
          <a href="/" className={buttonVariants({ variant: "outline" })}>
            {t("profile.backHome")}
          </a>
        </div>
      </div>
    </div>
  );
}
