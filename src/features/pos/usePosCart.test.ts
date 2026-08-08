import { describe, expect, it } from "vitest";

import { calculateCartTotals, type CartLine } from "./usePosCart";
import { DiscountType } from "@/lib/enums";

const line: CartLine = {
  variantId: 1,
  productId: 1,
  sku: "SKU-1",
  productName: "Item",
  brandName: null,
  attributes: [],
  imageUrl: null,
  unitPrice: 100,
  unitSaleDiscount: 10,
  unitTax: 9,
  unitTotal: 99,
  saleName: null,
  stockQuantity: 10,
  quantity: 2,
};

describe("calculateCartTotals", () => {
  it("combines sale discount, tax and delivery", () => {
    expect(calculateCartTotals([line], DiscountType.None, 0, 5)).toEqual({
      grossSubtotal: 200,
      saleDiscount: 20,
      netSubtotal: 180,
      tax: 18,
      orderDiscount: 0,
      deliveryFee: 5,
      total: 203,
      itemCount: 2,
    });
  });

  it("clamps percentage and fixed discounts", () => {
    expect(calculateCartTotals([line], DiscountType.Percent, 150, 0).total).toBe(18);
    expect(calculateCartTotals([line], DiscountType.Amount, 999, 0).total).toBe(18);
  });
});
