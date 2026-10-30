import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/** Paper container: 24px radius, hairline border and the whisper shadow. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-surface border border-border bg-card shadow-card", className)}>
      {children}
    </div>
  );
}

export type Crumb = { label: ReactNode; to?: string; params?: Record<string, string> };

/** Typographic path: gray ancestors and chevrons, ink current segment. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={index}>
              <li className={cn("min-w-0", last && "truncate font-medium text-foreground")}>
                {item.to && !last ? (
                  <Link
                    // Crumbs are built from known routes; the router's literal path types
                    // can't follow a string through props.
                    to={item.to as never}
                    params={item.params as never}
                    className="transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined}>{item.label}</span>
                )}
              </li>
              {!last && (
                <li aria-hidden>
                  <ChevronRight className="size-3.5 rtl:rotate-180" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="text-heading-sm font-semibold text-foreground lg:text-heading">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * DESIGN.md stat block: an uppercase caption over a large tabular value, no card
 * chrome. Place several in a StatStrip so hairline rules separate them.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  className,
}: {
  icon?: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 border-s border-border ps-4", className)}>
      <p className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-[0.05em] text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0 text-brand" aria-hidden />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 truncate text-heading-sm font-semibold tabular text-foreground lg:text-heading">
        {value}
      </p>
      {detail && <p className="mt-1 truncate text-[13px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function StatStrip({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>{children}</div>;
}

/** Header band inside a card: title, optional description and actions (filters, buttons). */
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
        "flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-body-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end [&>*]:min-w-0 [&>*]:flex-1 md:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Keeps every body cell's data-label in sync with its column header, so stacked rows
 * on phones can show "Label  value" pairs without each screen repeating the labels.
 */
function useStackedLabels(ref: React.RefObject<HTMLTableElement | null>, enabled: boolean) {
  useEffect(() => {
    const table = ref.current;
    if (!table || !enabled) return;

    const sync = () => {
      const headerRow = table.tHead?.rows[table.tHead.rows.length - 1];
      if (!headerRow) return;
      const labels: string[] = [];
      for (const cell of Array.from(headerRow.cells)) {
        // Action columns stay unlabelled so their buttons span the stacked row.
        const text = cell.hasAttribute("data-actions") ? "" : (cell.textContent?.trim() ?? "");
        labels.push(text);
        for (let extra = 1; extra < cell.colSpan; extra += 1) labels.push("");
      }
      const rows = [
        ...Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)),
        ...(table.tFoot ? Array.from(table.tFoot.rows) : []),
      ];
      for (const row of rows) {
        let column = 0;
        for (const cell of Array.from(row.cells)) {
          const label = cell.colSpan > 1 ? "" : (labels[column] ?? "");
          if (label) {
            if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
          } else if (cell.hasAttribute("data-label")) {
            cell.removeAttribute("data-label");
          }
          column += cell.colSpan || 1;
        }
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(table, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [ref, enabled]);
}

export function TableShell({
  children,
  className,
  stack = true,
}: {
  children: ReactNode;
  className?: string;
  /** Restack rows into labelled blocks below 768px. */
  stack?: boolean;
}) {
  const ref = useRef<HTMLTableElement>(null);
  useStackedLabels(ref, stack);
  return (
    <div className={cn("max-w-full overflow-x-auto overscroll-x-contain", className)}>
      <table
        ref={ref}
        data-stack={stack ? "" : undefined}
        className="w-full border-collapse text-sm"
      >
        {children}
      </table>
    </div>
  );
}

/**
 * One width scale for every table, so the same kind of column sits at the same size everywhere:
 * xs counts and quantities · sm money, codes, lots and dates · md statuses, phones, branches and types ·
 * lg date-times and date ranges. Columns without a width (names, descriptions) share the space left
 * over, and the actions column shrinks to its buttons.
 */
const columnWidths = { xs: "w-24", sm: "w-32", md: "w-40", lg: "w-52" } as const;

/** A text column that follows a number column starts further away, so each number reads as part of its own column. */
const afterNumberGap = "[[data-align=end]+&]:ps-8";

export function Th({
  children,
  className,
  align = "start",
  width,
  actions = false,
}: {
  children?: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
  width?: keyof typeof columnWidths;
  /** Marks the row-actions column; stacked rows show its buttons without a label. */
  actions?: boolean;
}) {
  return (
    <th
      scope="col"
      data-align={align}
      data-actions={actions ? "" : undefined}
      className={cn(
        "h-10 whitespace-nowrap border-b border-border px-3 text-[13px] font-medium text-muted-foreground first:ps-4 last:pe-4",
        align === "end" && "text-end",
        align === "center" && "text-center",
        align === "start" && "text-start",
        align !== "end" && afterNumberGap,
        width && columnWidths[width],
        actions && "w-px",
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
      data-align={align}
      className={cn(
        "border-b border-border px-3 py-2.5 text-foreground first:ps-4 last:pe-4 [tr:last-child>&]:border-b-0",
        align === "end" && "text-end tabular-nums",
        align === "center" && "text-center",
        align !== "end" && afterNumberGap,
        className,
      )}
    >
      {children}
    </td>
  );
}

export function KeyValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
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
  /** Only "destructive" changes colour; the others are kept for call-site meaning. */
  tone?: "success" | "warning" | "destructive";
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong ? "py-1.5" : "py-1")}>
      <span
        className={cn("text-sm", strong ? "font-medium text-foreground" : "text-muted-foreground")}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm tabular text-foreground",
          strong && "text-heading-sm font-semibold",
          tone === "warning" && "font-medium",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}
