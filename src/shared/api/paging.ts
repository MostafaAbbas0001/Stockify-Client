/** Response shapes taken from the Stockify API documentation. */
export type Paged<T> = {
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
} & Record<string, T[] | number>;

export type PagedResult<T> = {
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
  items: T[];
};

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
