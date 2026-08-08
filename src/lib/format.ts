import type { Locale } from "@/i18n";

const localeTag: Record<Locale, string> = { en: "en-US", ar: "ar-EG" };

export function formatMoney(
  value: number | null | undefined,
  locale: Locale,
  symbol?: string | null,
): string {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat(localeTag[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return symbol ? `${symbol} ${formatted}` : formatted;
}

export function formatNumber(value: number | null | undefined, locale: Locale): string {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(localeTag[locale]).format(amount);
}

export function formatPercent(value: number | null | undefined, locale: Locale): string {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(localeTag[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag[locale], {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag[locale], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** ISO date (yyyy-mm-dd) for date inputs and range query params. */
export function toDateInput(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

export function endOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59`).toISOString();
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}
