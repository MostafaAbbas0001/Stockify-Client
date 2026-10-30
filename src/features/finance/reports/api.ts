import { type QueryValue, downloadFile } from "@/shared/api/download";

export const reportsApi = {
  download: (report: string, query: Record<string, QueryValue> = {}) =>
    downloadFile(`reports/${report}`, query),
};
