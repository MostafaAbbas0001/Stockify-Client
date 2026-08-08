import { apiFetch } from "../client";
import type { PagedResult } from "../types";

export type QueryValue = string | number | boolean | null | undefined;

/** Backend paged responses name their collection after the resource. */
export function unwrapPaged<T>(payload: unknown, collection: string): PagedResult<T> {
  const body = (payload ?? {}) as Record<string, unknown>;
  const raw = body[collection];
  return {
    totalCount: typeof body["totalCount"] === "number" ? body["totalCount"] : 0,
    page: typeof body["page"] === "number" ? body["page"] : 1,
    perPage: typeof body["perPage"] === "number" ? body["perPage"] : 20,
    totalPages: typeof body["totalPages"] === "number" ? body["totalPages"] : 1,
    items: Array.isArray(raw) ? (raw as T[]) : [],
  };
}

export async function downloadFile(path: string, query: Record<string, QueryValue>) {
  const response = await apiFetch(path, { query });
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] ? decodeURIComponent(match[1]) : "stockify-report.xlsx";
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
