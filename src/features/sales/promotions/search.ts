/** URL search params of the promotions screen; invalid values are dropped. */
export type SalesSearch = {
  q?: string | undefined;
  /** Sale type lookup id. */
  type?: number | undefined;
  active?: "yes" | "no" | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
};

export function validateSalesSearch(raw: Record<string, unknown>): SalesSearch {
  return {
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
    type: Number(raw["type"]) > 0 ? Number(raw["type"]) : undefined,
    active: raw["active"] === "yes" || raw["active"] === "no" ? raw["active"] : undefined,
    from: typeof raw["from"] === "string" && raw["from"] ? raw["from"] : undefined,
    to: typeof raw["to"] === "string" && raw["to"] ? raw["to"] : undefined,
    page: Math.max(1, Number(raw["page"]) || 1),
  };
}
