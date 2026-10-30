import type { Tone } from "@/shared/components/StatusBadge";

/** One row of a lookup table (statuses, types, methods). Rules compare `code`; badges use `tone`. */
export type LookupItem = { id: number; code: string; name: string; tone: Tone; sortOrder: number };

/** Response of GET /api/lookups: every lookup list, keyed by name. */
export type Lookups = {
  orderStatuses: LookupItem[];
  orderTypes: LookupItem[];
  invoiceStatuses: LookupItem[];
  paymentMethods: LookupItem[];
  movementTypes: LookupItem[];
  stockTransferStatuses: LookupItem[];
  saleTypes: LookupItem[];
  discountTypes: LookupItem[];
  businessTypes: LookupItem[];
  expenseLineTypes: LookupItem[];
  expenseStatuses: LookupItem[];
};

export type LookupListName = keyof Lookups;
