/**
 * The few lookup codes the client's own rules depend on. They mirror
 * Stockify.Domain/Lookups/LookupCodes.cs; ids, labels and colours come from GET /api/lookups.
 */
export const PaymentMethodCode = { Cash: "CASH" } as const;

export const DiscountTypeCode = { None: "NONE", Percent: "PERCENT", Amount: "AMOUNT" } as const;

export const SaleTypeCode = { Percentage: "PERCENTAGE" } as const;

export const InvoiceStatusCode = { Void: "VOID", WrittenOff: "WRITTEN_OFF" } as const;

export const TransferStatusCode = {
  Draft: "DRAFT",
  Sent: "SENT",
  PartiallyReceived: "PARTIALLY_RECEIVED",
  Completed: "COMPLETED",
  Cancelled: "CANCELLED",
} as const;

export const ExpenseLineTypeCode = {
  Amount: "AMOUNT",
  Fixed: "FIXED",
  Percentage: "PERCENTAGE",
  Quantity: "QUANTITY",
} as const;
