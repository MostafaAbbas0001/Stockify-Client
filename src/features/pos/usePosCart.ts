import { useCallback, useMemo, useState } from "react";

import type { PosItem } from "@/lib/api/types";
import { DiscountType, type DiscountTypeValue } from "@/lib/enums";

export type CartLine = {
  variantId: number;
  productId: number;
  sku: string;
  productName: string;
  brandName: string | null;
  attributes: string[];
  imageUrl: string | null;
  /** Per-unit values exactly as returned by GET /api/pos/items. */
  unitPrice: number;
  unitSaleDiscount: number;
  unitTax: number;
  unitTotal: number;
  saleName: string | null;
  stockQuantity: number;
  quantity: number;
};

export function lineFromPosItem(item: PosItem, quantity = 1): CartLine {
  return {
    variantId: item.variantId,
    productId: item.productId,
    sku: item.sku,
    productName: item.productName,
    brandName: item.brandName,
    attributes: item.attributes ?? [],
    imageUrl: item.imageUrl,
    unitPrice: item.price,
    unitSaleDiscount: item.saleDiscount,
    unitTax: item.itemTax,
    unitTotal: item.totalAmount,
    saleName: item.saleName,
    stockQuantity: item.stockQuantity,
    quantity,
  };
}

export type CartTotals = {
  grossSubtotal: number;
  saleDiscount: number;
  netSubtotal: number;
  tax: number;
  orderDiscount: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
};

export function calculateCartTotals(
  lines: readonly CartLine[],
  discountType: DiscountTypeValue,
  discountValue: number,
  deliveryFee: number,
): CartTotals {
  const grossSubtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const saleDiscount = lines.reduce((sum, line) => sum + line.unitSaleDiscount * line.quantity, 0);
  const netSubtotal = grossSubtotal - saleDiscount;
  const tax = lines.reduce((sum, line) => sum + line.unitTax * line.quantity, 0);

  let orderDiscount = 0;
  if (discountType === DiscountType.Percent) {
    orderDiscount = (netSubtotal * Math.max(0, Math.min(discountValue, 100))) / 100;
  } else if (discountType === DiscountType.Amount) {
    orderDiscount = Math.max(0, Math.min(discountValue, netSubtotal));
  }

  return {
    grossSubtotal,
    saleDiscount,
    netSubtotal,
    tax,
    orderDiscount,
    deliveryFee,
    total: Math.max(0, netSubtotal + tax + deliveryFee - orderDiscount),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export function usePosCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<DiscountTypeValue>(DiscountType.None);
  const [discountValue, setDiscountValue] = useState<number>(0);

  const addLine = useCallback((item: PosItem, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.variantId === item.variantId);
      if (!existing)
        return [...current, lineFromPosItem(item, Math.min(quantity, item.stockQuantity))];
      return current.map((line) =>
        line.variantId === item.variantId
          ? {
              ...line,
              stockQuantity: item.stockQuantity,
              quantity: Math.min(line.quantity + quantity, item.stockQuantity),
            }
          : line,
      );
    });
  }, []);

  const setQuantity = useCallback((variantId: number, quantity: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.variantId === variantId
            ? { ...line, quantity: Math.max(0, Math.min(quantity, line.stockQuantity)) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((variantId: number) => {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  }, []);

  const reset = useCallback(() => {
    setLines([]);
    setDiscountType(DiscountType.None);
    setDiscountValue(0);
  }, []);

  const totalsFor = useCallback(
    (deliveryFee: number): CartTotals =>
      calculateCartTotals(lines, discountType, discountValue, deliveryFee),
    [lines, discountType, discountValue],
  );

  const itemsPayload = useMemo(
    () => lines.map((line) => ({ productVariantId: line.variantId, quantity: line.quantity })),
    [lines],
  );

  return {
    lines,
    addLine,
    setQuantity,
    removeLine,
    reset,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    totalsFor,
    itemsPayload,
  };
}
