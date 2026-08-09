import { AlertCircle, Inbox, Loader2, Lock, RefreshCw, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { useI18n } from "@/i18n";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-surface/70 px-6 py-14 text-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <Frame className="border-solid">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{label ?? t("common.loading")}</p>
    </Frame>
  );
}

export function EmptyState({
  title,
  description,
  action,
  filtered = false,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  filtered?: boolean;
}) {
  const { t } = useI18n();
  const Icon = filtered ? SearchX : Inbox;
  return (
    <Frame className="min-h-44 rounded-none border-0 bg-transparent py-10">
      <Icon className="size-7 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {title ?? (filtered ? t("common.noResults") : t("common.noRecords"))}
        </p>
        <p className="mx-auto max-w-sm text-xs text-muted-foreground">
          {description ?? (filtered ? t("common.noResultsHint") : "")}
        </p>
      </div>
      {action}
    </Frame>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const apiError = isApiError(error) ? error : null;
  const [copied, setCopied] = useState(false);

  if (apiError?.isForbidden) {
    return (
      <Frame>
        <Lock className="size-7 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{t("common.accessDeniedTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("common.accessDeniedBody")}</p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <AlertCircle className="size-7 text-destructive" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{t("common.errorTitle")}</p>
        <p className="mx-auto max-w-md text-xs text-muted-foreground">
          {apiError?.isServerError
            ? t("common.serverErrorBody")
            : (apiError?.message ?? t("common.serverErrorBody"))}
        </p>
        {apiError?.traceId && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(apiError.traceId!);
              setCopied(true);
            }}
            className="rounded-md bg-muted px-2 py-1 text-[0.68rem] text-muted-foreground/70"
            title={t("common.copy")}
          >
            {t("common.traceId")}: <span className="font-mono">{apiError.traceId}</span> ·{" "}
            {t(copied ? "common.copied" : "common.copy")}
          </button>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <RefreshCw className="size-4" />
          {t("common.retry")}
        </button>
      )}
    </Frame>
  );
}

export function AccessDenied() {
  const { t } = useI18n();
  return (
    <Frame>
      <Lock className="size-7 text-destructive" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{t("common.accessDeniedTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("common.accessDeniedBody")}</p>
      </div>
    </Frame>
  );
}
