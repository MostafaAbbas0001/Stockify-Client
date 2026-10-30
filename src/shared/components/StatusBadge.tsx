import type { ReactNode } from "react";

import { Badge, type BadgeVariant } from "@/shared/ui/badge";

export type Tone = "neutral" | "info" | "success" | "warning" | "error" | "primary";

/**
 * Lookup rows carry a tone; the palette is achromatic, so each tone maps to a badge
 * shape: done = solid, confirmed = ink outline, in progress = outline,
 * partial = dashed, neutral = soft, failed or cancelled = red outline.
 */
const TONE_VARIANT: Record<Tone, BadgeVariant> = {
  neutral: "soft",
  info: "outline",
  primary: "strong",
  success: "solid",
  warning: "dashed",
  error: "destructive",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant={TONE_VARIANT[tone]} {...(className ? { className } : {})}>
      {children}
    </Badge>
  );
}
