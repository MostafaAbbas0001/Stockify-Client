import { cn } from "@/shared/lib/utils";

/*
 * Class recipes shared by the UI primitives and by elements that need to look like
 * them (links styled as buttons, custom inputs). Kept apart from the component files
 * so those stay component-only for fast refresh.
 */

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "destructive" | "quiet" | "quiet-destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // Ink on paper: the only high-emphasis treatment.
  primary: "bg-primary text-primary-foreground hover:bg-primary/85",
  // Tonal sibling of primary; sits on paper surfaces.
  secondary: "bg-muted text-foreground hover:bg-accent",
  // Hairline-bounded; works on the canvas and inside cards.
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  // Icon actions in rows and toolbars: gray at rest, ink on hover.
  quiet: "text-muted-foreground hover:bg-muted hover:text-foreground",
  "quiet-destructive": "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
};

// Phones get 44px targets; pointer layouts tighten to DESIGN.md's 36px pill.
const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-[13px] sm:h-8",
  md: "h-11 gap-2 px-4 text-sm sm:h-9 sm:px-3.5",
  lg: "h-12 gap-2 px-5 text-[15px] sm:h-11",
  icon: "size-11 sm:size-9",
  "icon-sm": "size-9 sm:size-8",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
} = {}) {
  return cn(
    "inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-control font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

/**
 * Soft-gray fill at rest, paper with a 1px ring on focus (DESIGN.md "Input Field").
 * 16px text on phones stops iOS from zooming into focused fields.
 */
export const fieldClass =
  "w-full min-w-0 rounded-control border border-transparent bg-muted px-3.5 text-base text-foreground outline-none transition-[background-color,border-color] placeholder:text-muted-foreground focus:border-ring focus:bg-card disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive sm:text-sm";

export const inputClass = `${fieldClass} h-11 sm:h-9`;
