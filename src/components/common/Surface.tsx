import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_oklch(0_0_0/0.035),0_12px_32px_oklch(0_0_0/0.025)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const STAT_TONES = {
  primary: "text-primary",
  success: "text-primary",
  warning: "text-primary",
  error: "text-primary",
  info: "text-primary",
  neutral: "text-primary",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <Card className="group relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 truncate font-numeric text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]">
            {value}
          </p>
          {detail && <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <span
          className={cn(
            "shrink-0 transition-transform duration-200 group-hover:scale-105",
            STAT_TONES[tone],
          )}
        >
          <Icon className="size-6" />
        </span>
      </div>
    </Card>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
      )}
    </div>
  );
}

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-full overflow-x-auto overscroll-x-contain", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "start",
}: {
  children?: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-border/70 bg-surface-sunken/65 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        align === "end" && "text-end",
        align === "center" && "text-center",
        align === "start" && "text-start",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "start",
}: {
  children?: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-border/60 px-4 py-3.5 text-foreground",
        align === "end" && "text-end",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function KeyValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function MoneyRow({
  label,
  value,
  strong = false,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  tone?: "success" | "warning" | "destructive";
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", strong ? "py-2" : "py-1.5")}>
      <span
        className={cn(
          "text-sm",
          strong ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-numeric text-sm tabular-nums",
          strong ? "text-xl font-bold tracking-tight text-foreground" : "text-foreground",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}
