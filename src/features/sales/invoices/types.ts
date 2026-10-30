export type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  invoiceStatusId: number;
  statusCode: string;
  statusName: string;
  issuedAt: string;
  totalAmount: number;
  paidAmount: number;
  orderNumber: string | null;
};

export type InvoicePayment = {
  id?: number;
  amount: number;
  paymentMethodId: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  reference?: string | null;
  paidAt: string;
  currencyId?: number;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  baseAmount?: number;
};

export type InvoiceItem = {
  id?: number;
  invoiceItemId?: number;
  productVariantId?: number;
  sku?: string | null;
  productName?: string | null;
  attributes?: string[];
  quantity: number;
  returnedQuantity: number;
  unitPrice?: number;
  price?: number;
  saleDiscount?: number;
  taxAmount?: number;
  totalAmount?: number;
};

export type CreditMemo = {
  id?: number;
  creditMemoNumber?: string | null;
  reason?: string | null;
  createdAt?: string;
  issuedAt?: string;
  totalAmount?: number;
  items?: {
    invoiceItemId?: number;
    productName?: string | null;
    sku?: string | null;
    quantity: number;
    reason?: string | null;
    amount?: number;
  }[];
};

export type InvoiceDetail = {
  id: number;
  invoiceNumber: string;
  invoiceStatusId: number;
  statusCode: string;
  statusName: string;
  issuedAt: string;
  subtotal?: number;
  taxAmount?: number;
  deliveryChargeAmount?: number;
  saleAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  paidAmount: number;
  orderId?: number | null;
  orderNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  branchName?: string | null;
  employeeName?: string | null;
  createdByEmployeeName?: string | null;
  payments?: InvoicePayment[];
  invoiceItems?: InvoiceItem[];
  items?: InvoiceItem[];
  creditMemos?: CreditMemo[];
};

export type PaymentRequest = {
  amount: number;
  paymentMethodId: number;
  reference: string;
  currencyId: number;
};

export type ReturnRequest = {
  reason: string;
  items: { invoiceItemId: number; quantity: number; reason: string }[];
};
