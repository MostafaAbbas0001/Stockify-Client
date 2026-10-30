import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { lookupsApi } from "@/features/lookups/api";
import type { LookupItem, LookupListName } from "@/features/lookups/types";
import { useI18n } from "@/shared/i18n";

/** Lookups are global and change only with a deployment, so one fetch per session is enough. */
export const lookupsQuery = () =>
  queryOptions({ queryKey: ["lookups"] as const, queryFn: lookupsApi.all, staleTime: Infinity });

export function useLookups() {
  const { t } = useI18n();
  const { data } = useQuery(lookupsQuery());

  return useMemo(() => {
    const list = (name: LookupListName): LookupItem[] => data?.[name] ?? [];
    const byCode = (name: LookupListName, code: string | null | undefined) =>
      code ? list(name).find((item) => item.code === code) : undefined;
    const byId = (name: LookupListName, id: number | null | undefined) =>
      id == null ? undefined : list(name).find((item) => item.id === id);
    /** Translated label (`lookups.<list>.<CODE>`), falling back to the database name. */
    const label = (name: LookupListName, item: LookupItem | undefined, fallback = "") => {
      if (!item) return fallback;
      const key = `lookups.${name}.${item.code}`;
      const translated = t(key);
      return translated === key ? item.name : translated;
    };
    /** Label for a code carried on an API row, with the row's own name as the fallback. */
    const labelOf = (
      name: LookupListName,
      code: string | null | undefined,
      fallback?: string | null,
    ) => label(name, byCode(name, code), fallback ?? code ?? "—");
    return { ready: data !== undefined, list, byCode, byId, label, labelOf };
  }, [data, t]);
}
