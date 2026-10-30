import { AlertCircle, Inbox, Loader2, Lock, RefreshCw, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { useI18n } from "@/shared/i18n";
import { isApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 px-4 py-8 text-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

function StateIcon({ icon: Icon, tone }: { icon: typeof Inbox; tone?: "destructive" }) {
  return (
    <span
      className={cn(
        "grid size-10 place-items-center rounded-control bg-muted",
        tone === "destructive" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <Frame>
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground" role="status">
        {label ?? t("common.loading")}
      </p>
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
  const hint = description ?? (filtered ? t("common.noResultsHint") : "");
  return (
    <Frame className="min-h-36 py-6">
      <StateIcon icon={filtered ? SearchX : Inbox} />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {title ?? (filtered ? t("common.noResults") : t("common.noRecords"))}
        </p>
        {hint && <p className="mx-auto max-w-sm text-[13px] text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </Frame>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const apiError = isApiError(error) ? error : null;
  const [copied, setCopied] = useState(false);

  if (apiError?.isForbidden) return <AccessDenied />;

  return (
    <Frame>
      <StateIcon icon={AlertCircle} tone="destructive" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{t("common.errorTitle")}</p>
        <p className="mx-auto max-w-md text-[13px] text-muted-foreground">
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
            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-control bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            title={t("common.copy")}
          >
            <span className="truncate">
              {t("common.traceId")}: <span className="font-mono">{apiError.traceId}</span>
            </span>
            <span className="shrink-0 font-medium">
              {t(copied ? "common.copied" : "common.copy")}
            </span>
          </button>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4" />
          {t("common.retry")}
        </Button>
      )}
    </Frame>
  );
}

export function AccessDenied() {
  const { t } = useI18n();
  return (
    <Frame>
      <StateIcon icon={Lock} />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{t("common.accessDeniedTitle")}</p>
        <p className="text-[13px] text-muted-foreground">{t("common.accessDeniedBody")}</p>
      </div>
    </Frame>
  );
}
