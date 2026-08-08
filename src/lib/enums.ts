/**
 * Single source of truth for backend numeric enums and status presentation.
 * Numeric values are never shown to users.
 */

export type SemanticTone = "neutral" | "info" | "success" | "warning" | "error" | "primary";

export const DiscountType = { None: 0, Percent: 1, Amount: 2 } as const;
export type DiscountTypeValue = (typeof DiscountType)[keyof typeof DiscountType];

export const SaleType = { Percentage: 1, FixedAmount: 2 } as const;

export const OrderStatus = {
  Draft: 1,
  InTransit: 2,
  Delivered: 3,
  FullyPaid: 4,
  PartiallyPaid: 5,
  Returned: 6,
  PartiallyReturned: 7,
  Cancelled: 8,
} as const;

export const InvoiceStatus = {
  Issued: 1,
  PartiallyPaid: 2,
  FullyPaid: 3,
  Void: 4,
  WrittenOff: 5,
  Refunded: 6,
  PartiallyRefunded: 7,
} as const;

export const TransferStatus = {
  Draft: 1,
  Sent: 2,
  PartiallyReceived: 3,
  Completed: 4,
  Cancelled: 5,
} as const;

export const MovementType = {
  AddManually: 1,
  Sale: 2,
  ReturnFromClient: 3,
  RemoveManually: 4,
  TransferOut: 5,
  TransferIn: 6,
  TransferCancelled: 7,
} as const;

type StatusMeta = { key: string; tone: SemanticTone };

const ORDER_STATUS_META: Record<number, StatusMeta> = {
  1: { key: "status.order.draft", tone: "neutral" },
  2: { key: "status.order.inTransit", tone: "info" },
  3: { key: "status.order.delivered", tone: "primary" },
  4: { key: "status.order.fullyPaid", tone: "success" },
  5: { key: "status.order.partiallyPaid", tone: "warning" },
  6: { key: "status.order.returned", tone: "error" },
  7: { key: "status.order.partiallyReturned", tone: "warning" },
  8: { key: "status.order.cancelled", tone: "error" },
};

const INVOICE_STATUS_META: Record<number, StatusMeta> = {
  1: { key: "status.invoice.issued", tone: "neutral" },
  2: { key: "status.invoice.partiallyPaid", tone: "warning" },
  3: { key: "status.invoice.fullyPaid", tone: "success" },
  4: { key: "status.invoice.void", tone: "error" },
  5: { key: "status.invoice.writtenOff", tone: "error" },
  6: { key: "status.invoice.refunded", tone: "error" },
  7: { key: "status.invoice.partiallyRefunded", tone: "warning" },
};

const TRANSFER_STATUS_META: Record<number, StatusMeta> = {
  1: { key: "status.transfer.draft", tone: "neutral" },
  2: { key: "status.transfer.sent", tone: "info" },
  3: { key: "status.transfer.partiallyReceived", tone: "warning" },
  4: { key: "status.transfer.completed", tone: "success" },
  5: { key: "status.transfer.cancelled", tone: "error" },
};

const MOVEMENT_TYPE_META: Record<number, StatusMeta> = {
  1: { key: "status.movement.addManually", tone: "success" },
  2: { key: "status.movement.sale", tone: "info" },
  3: { key: "status.movement.returnFromClient", tone: "warning" },
  4: { key: "status.movement.removeManually", tone: "error" },
  5: { key: "status.movement.transferOut", tone: "warning" },
  6: { key: "status.movement.transferIn", tone: "info" },
  7: { key: "status.movement.transferCancelled", tone: "neutral" },
};

/** Backend list rows often carry only `statusName`; map by name as a fallback. */
const NAME_TO_ID: Record<string, number> = {
  draft: 1,
  "in transit": 2,
  intransit: 2,
  delivered: 3,
  "fully paid": 4,
  fullypaid: 4,
  "partially paid": 5,
  partiallypaid: 5,
  returned: 6,
  "partially returned": 7,
  partiallyreturned: 7,
  cancelled: 8,
  canceled: 8,
};

const INVOICE_NAME_TO_ID: Record<string, number> = {
  issued: 1,
  "partially paid": 2,
  "fully paid": 3,
  void: 4,
  "written off": 5,
  refunded: 6,
  "partially refunded": 7,
};

export function orderStatusMeta(input: { statusId?: number | null; statusName?: string | null }) {
  const id =
    input.statusId ??
    (input.statusName ? NAME_TO_ID[input.statusName.trim().toLowerCase()] : undefined);
  return {
    meta: id ? ORDER_STATUS_META[id] : undefined,
    id: id ?? null,
    fallback: input.statusName ?? "",
  };
}

export function invoiceStatusMeta(input: { statusId?: number | null; statusName?: string | null }) {
  const id =
    input.statusId ??
    (input.statusName ? INVOICE_NAME_TO_ID[input.statusName.trim().toLowerCase()] : undefined);
  return {
    meta: id ? INVOICE_STATUS_META[id] : undefined,
    id: id ?? null,
    fallback: input.statusName ?? "",
  };
}

export function transferStatusMeta(statusId: number) {
  return TRANSFER_STATUS_META[statusId];
}

export function movementTypeMeta(typeId: number) {
  return MOVEMENT_TYPE_META[typeId];
}

/** Order lifecycle actions available for a status, before permission filtering. */
export function orderActionsFor(statusId: number | null): ("ship" | "deliver" | "cancel")[] {
  if (statusId === null) return [];
  switch (statusId) {
    case OrderStatus.Draft:
      return ["ship", "cancel"];
    case OrderStatus.InTransit:
      return ["deliver", "cancel"];
    case OrderStatus.Delivered:
    case OrderStatus.PartiallyPaid:
      return ["cancel"];
    default:
      return [];
  }
}
