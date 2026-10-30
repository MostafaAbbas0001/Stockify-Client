/** URL search params of the screen; invalid values are dropped. */
export type DashboardSearch = {
  from?: string | undefined;
  to?: string | undefined;
  branch?: number | undefined;
};

export function validateDashboardSearch(raw: Record<string, unknown>): DashboardSearch {
  return {
    from: typeof raw["from"] === "string" && raw["from"] ? raw["from"] : undefined,
    to: typeof raw["to"] === "string" && raw["to"] ? raw["to"] : undefined,
    branch: Number(raw["branch"]) > 0 ? Number(raw["branch"]) : undefined,
  };
}
