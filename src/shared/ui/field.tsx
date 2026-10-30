import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export const labelClass = "block text-[13px] font-medium text-foreground";

/** Label + control + hint or error, stacked. Wrap a single control. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block min-w-0 space-y-1.5", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

/** Field-level error line under a control. */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <span className="block text-xs text-destructive">{children}</span>;
}

/** Form- or dialog-level error message. */
export function FormError({ children, className }: { children?: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-control border border-destructive/30 bg-card px-3.5 py-2.5 text-[13px] text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Checkbox with a label; 44px tall on phones. */
export function CheckboxField({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 sm:min-h-9",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}
