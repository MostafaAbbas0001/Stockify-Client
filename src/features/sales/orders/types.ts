export type OrderRow = {
  id: number;
  orderNumber: string;
  totalAmount: number;
  customerName: string | null;
  statusId: number;
  statusCode: string;
  statusName: string;
  deliveryLocation: string | null;
  deliveryLocationId: number | null;
  createdAt: string;
};

export type OrderAction = "ship" | "deliver" | "cancel";

export type OrderDetail = {
  id: number;
  orderNumber: string;
  statusId: number;
  statusCode: string;
  statusName: string;
  /** Lifecycle actions the server allows for the current status (before permission checks). */
  allowedActions: OrderAction[];
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  deliveryLocation: string | null;
  createdAt: string;
  shippedAt: string | null;
  cancelledAt: string | null;
  createdByEmployeeName: string | null;
  invoiceId: number | null;
  subtotal: number;
  taxAmount: number;
  deliveryChargeAmount: number;
  saleAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  payments: {
    amount: number;
    paymentMethodId: number;
    paymentMethodCode: string;
    paymentMethodName: string;
    paidAt: string;
    currencyId: number;
    currencySymbol: string | null;
  }[];
  items: {
    orderItemId: number;
    productVariantId: number;
    sku: string;
    productName: string;
    attributes: string[];
    quantity: number;
    lots: {
      inventoryLotId: number;
      lotNumber: string | null;
      expiryDate: string | null;
      quantity: number;
      returnedQuantity: number;
    }[];
  }[];
};

export type CreateOrderRequest = {
  customerId: number;
  deliveryLocationId: number;
  createdByEmployeeId: number;
  /** Null means no order discount. */
  discountTypeId: number | null;
  discountValue: number;
  items: { productVariantId: number; quantity: number }[];
};

export type CreateOrderResponse = { orderId: number; invoiceId: number };
