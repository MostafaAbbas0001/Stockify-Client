import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * DESIGN.md badges, extended so state reads from shape instead of hue:
 * solid (brand blue) = done, soft = neutral, outline = informational, strong (navy) = confirmed,
 * dashed (blue) = partial, destructive = failed or cancelled.
 */
export type BadgeVariant = "solid" | "soft" | "outline" | "strong" | "dashed" | "destructive";

const VARIANTS: Record<BadgeVariant, string> = {
  solid: "border-primary bg-primary text-primary-foreground",
  soft: "border-transparent bg-muted text-foreground",
  outline: "border-border bg-transparent text-foreground",
  strong: "border-navy bg-transparent text-navy",
  dashed: "border-dashed border-primary bg-transparent text-primary-strong",
  destructive: "border-destructive/40 bg-transparent text-destructive",
};

export function Badge({
  variant = "soft",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 whitespace-nowrap rounded-control border px-2 text-xs font-medium tracking-normal",
        VARIANTS[variant],
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
