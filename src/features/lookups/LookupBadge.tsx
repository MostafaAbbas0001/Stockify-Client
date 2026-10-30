import { useLookups } from "@/features/lookups/useLookups";
import type { LookupListName } from "@/features/lookups/types";
import { StatusBadge } from "@/shared/components/StatusBadge";

/** Status badge coloured by the lookup row's tone; pass the row's code (preferred) or id. */
export function LookupBadge({
  list,
  code,
  id,
  fallback,
}: {
  list: LookupListName;
  code?: string | null | undefined;
  id?: number | null | undefined;
  fallback?: string | null | undefined;
}) {
  const lookups = useLookups();
  const item = code ? lookups.byCode(list, code) : lookups.byId(list, id);
  return (
    <StatusBadge tone={item?.tone ?? "neutral"}>
      {lookups.label(list, item, fallback || "—")}
    </StatusBadge>
  );
}
