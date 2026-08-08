import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { SemanticTone } from "@/lib/enums";

const TONE_CLASS: Record<SemanticTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info-soft text-info border-info/25",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  error: "bg-error-soft text-destructive border-destructive/25",
  primary: "bg-primary-soft text-primary border-primary/25",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: SemanticTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
