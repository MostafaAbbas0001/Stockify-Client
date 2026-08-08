import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Small modal for destructive or irreversible confirmations. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "primary",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "destructive";
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {body && (
            <DialogDescription className="text-xs leading-relaxed">{body}</DialogDescription>
          )}
        </DialogHeader>
        {error && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:space-x-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold disabled:opacity-50",
              tone === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel ?? t("common.confirm")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
