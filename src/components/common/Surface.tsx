import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
      {children}
    </div>
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
        "flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
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
        "whitespace-nowrap border-b border-border bg-surface-sunken px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground",
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
        "border-b border-border px-4 py-3 text-foreground",
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
    <div className="flex items-center justify-between gap-4 py-1">
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
          strong ? "text-base font-semibold text-foreground" : "text-foreground",
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
