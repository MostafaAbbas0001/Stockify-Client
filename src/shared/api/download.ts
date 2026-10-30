import { apiFetch } from "@/shared/api/client";

export type QueryValue = string | number | boolean | null | undefined;

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
