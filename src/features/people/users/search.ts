/** URL search params of the screen; invalid values are dropped. */
export type UsersSearch = {
  q?: string | undefined;
  role?: number | undefined;
  branch?: number | undefined;
  page: number;
};

export function validateUsersSearch(raw: Record<string, unknown>): UsersSearch {
  return {
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
    role: Number(raw["role"]) > 0 ? Number(raw["role"]) : undefined,
    branch: Number(raw["branch"]) > 0 ? Number(raw["branch"]) : undefined,
    page: Math.max(1, Number(raw["page"]) || 1),
  };
}
