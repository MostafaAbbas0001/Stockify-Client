/** URL search params of the screen; invalid values are dropped. */
export type ExpensesSearch = {
  q?: string | undefined;
  branch?: number | undefined;
  group?: number | undefined;
  category?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page?: number | undefined;
};

export function validateExpensesSearch(raw: Record<string, unknown>): ExpensesSearch {
  return {
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
    branch: Number(raw["branch"]) > 0 ? Number(raw["branch"]) : undefined,
    group: Number(raw["group"]) > 0 ? Number(raw["group"]) : undefined,
    category: Number(raw["category"]) > 0 ? Number(raw["category"]) : undefined,
    from: typeof raw["from"] === "string" && raw["from"] ? raw["from"] : undefined,
    to: typeof raw["to"] === "string" && raw["to"] ? raw["to"] : undefined,
    page: Math.max(1, Number(raw["page"]) || 1),
  };
}
