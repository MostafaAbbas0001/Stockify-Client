import { describe, expect, it } from "vitest";

import {
  InvoiceStatus,
  OrderStatus,
  SaleType,
  invoiceStatusMeta,
  orderActionsFor,
  orderStatusMeta,
} from "./enums";

describe("backend enum mappings", () => {
  it("keeps sale types numeric", () => {
    expect(SaleType).toEqual({ Percentage: 1, FixedAmount: 2 });
  });

  it("maps order and invoice statuses to semantic labels", () => {
    expect(orderStatusMeta({ statusId: OrderStatus.FullyPaid }).meta).toMatchObject({
      key: "status.order.fullyPaid",
      tone: "success",
    });
    expect(invoiceStatusMeta({ statusId: InvoiceStatus.PartiallyPaid }).meta).toMatchObject({
      key: "status.invoice.partiallyPaid",
      tone: "warning",
    });
  });

  it("derives valid lifecycle actions", () => {
    expect(orderActionsFor(OrderStatus.Draft)).toEqual(["ship", "cancel"]);
    expect(orderActionsFor(OrderStatus.FullyPaid)).toEqual([]);
  });
});
