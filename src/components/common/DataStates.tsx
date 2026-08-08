import { AlertCircle, Inbox, Loader2, Lock, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { useI18n } from "@/i18n";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center",
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
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label ?? t("common.loading")}</p>
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
    <Frame>
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
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
        <span className="grid size-11 place-items-center rounded-full bg-error-soft text-destructive">
          <Lock className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{t("common.accessDeniedTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("common.accessDeniedBody")}</p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <span className="grid size-11 place-items-center rounded-full bg-error-soft text-destructive">
        <AlertCircle className="size-5" />
      </span>
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
          className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
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
      <span className="grid size-11 place-items-center rounded-full bg-error-soft text-destructive">
        <Lock className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{t("common.accessDeniedTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("common.accessDeniedBody")}</p>
      </div>
    </Frame>
  );
}
