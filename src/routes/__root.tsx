import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/i18n";
import { isApiError } from "@/lib/api/errors";

function NotFoundComponent() {
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("common.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.notFoundBody")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("profile.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("common.serverErrorTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isApiError(error) ? error.message : t("common.serverErrorBody")}
        </p>
        {traceId && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(traceId);
              setCopied(true);
            }}
            className="mt-3 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
            title={t("common.copy")}
          >
            {t("common.traceId")}: {traceId} · {t(copied ? "common.copied" : "common.copy")}
          </button>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("profile.backHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "robots",
        content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
      },
      {
        name: "googlebot",
        content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
      },
      { title: "Stockify — Retail POS, Inventory & Orders" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <Toaster position="top-center" richColors closeButton />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
