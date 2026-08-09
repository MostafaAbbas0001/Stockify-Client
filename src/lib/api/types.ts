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

export type LoginResponse = {
  token: string;
  refreshToken: string;
  expiresAt: string;
};

export type Lookup = { id: number; name: string };

export type Branch = {
  id: number;
  name: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
};

export type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
};

export type TaxRate = { id: number; name: string; rate: number };

export type DeliveryCharge = {
  id: number;
  locationName: string;
  fee: number;
  createdAt?: string;
  updatedAt?: string | null;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  email: string;
  createdAt?: string;
};

export type EmployeeRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  isSale: boolean;
  branchId: number;
  branchName?: string;
  createdAt?: string;
};

export type BranchEmployee = {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  isSale: boolean;
  branchId: number;
};

export type PosItem = {
  brandName: string | null;
  productName: string;
  imageUrl: string | null;
  attributes: string[];
  saleName: string | null;
  sku: string;
  productId: number;
  variantId: number;
  price: number;
  subtotal: number;
  saleDiscount: number;
  stockQuantity: number;
  barcode: string | null;
  isSellable: boolean;
  itemTax: number;
  totalAmount: number;
  saleTimeStart: string | null;
  saleEndTime: string | null;
  saleType: number | null;
  saleValue: number | null;
};

export type VariantRow = {
  id: number;
  sku: string;
  productName: string;
  brandName: string | null;
  categoryName: string | null;
  saleName: string | null;
  price: number;
  netPrice: number;
  barcode: string | null;
  imageUrl: string | null;
  productImageUrl: string | null;
  isSellable: boolean;
  createdAt: string;
  attributes: string[];
  stockQuantity: number;
  lowStockBranches: {
    branchId: number;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
  }[];
};

export type OrderRow = {
  id: number;
  orderNumber: string;
  totalAmount: number;
  customerName: string | null;
  statusName: string;
  deliveryLocation: string | null;
  deliveryLocationId: number | null;
  createdAt: string;
};

export type OrderDetail = {
  id: number;
  orderNumber: string;
  statusName: string;
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
    method: string;
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

export type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  invoiceStatusId: number;
  statusName: string;
  issuedAt: string;
  totalAmount: number;
  paidAmount: number;
  orderNumber: string | null;
};

export type InvoicePayment = {
  id?: number;
  amount: number;
  method: string;
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

export type UserPermissionsResponse = {
  userId: number;
  roleId: number;
  roleName: string;
  permissions: {
    id: number;
    key: string;
    target: string;
    roleDefault: boolean;
    userOverride: boolean | null;
    effective: boolean;
  }[];
};

/* ------------------------ finance & administration ------------------------ */

export type ExpenseCategory = {
  id: number;
  name: string;
  code: string | null;
};

export type ExpenseCurrencyTotal = {
  currencyId: number | null;
  currencyCode: string | null;
  currencySymbol: string | null;
  totalAmount: number;
};

export type ExpenseRow = {
  id: number;
  expenseNumber: string | null;
  expenseCategoryId: number;
  categoryName: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  createdAt: string;
  expensePeriodStart: string | null;
  expensePeriodEnd: string | null;
  currencies: ExpenseCurrencyTotal[];
};

export type ExpenseLinePayment = {
  id: number;
  expenseLineId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  createdByUserId: number | null;
  approvedAt: string | null;
  approvedByUserId: number | null;
  rejectionReason: string | null;
};

export type ExpenseLine = {
  id: number;
  categoryId: number;
  categoryName: string | null;
  categoryCode: string | null;
  totalAmount: number;
  currencyId: number | null;
  currencyCode: string | null;
  currencySymbol: string | null;
  note: string | null;
  statusId: number | null;
  statusName: string | null;
  employeeId: number | null;
  employeeName: string | null;
  startDate: string | null;
  endDate: string | null;
  itemName: string | null;
  purchaseDate: string | null;
  quantity: number | null;
  unitCost: number | null;
  supplierName: string | null;
  branchId: number | null;
  branchName: string | null;
  lineType: string | null;
  payments: ExpenseLinePayment[];
  expensePeriodStart: string | null;
  expensePeriodEnd: string | null;
  referenceNumber: string | null;
  additionalInfo: string | null;
};

export type ExpenseDetail = {
  id: number;
  categoryName: string | null;
  categoryCode: string | null;
  expenseNumber: string | null;
  expenseCategoryId: number;
  createdAt: string;
  updatedAt: string | null;
  createdByUserId: number | null;
  createdByUsername: string | null;
  lines: ExpenseLine[];
};

export type CreateExpenseLineRequest = {
  categoryId: number;
  amount: number;
  note?: string | null;
  employeeId?: number | null;
  currencyId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  itemName?: string | null;
  purchaseDate?: string | null;
  quantity?: number | null;
  unitCost?: number | null;
  rate?: number | null;
  lineType?: "Amount" | "Fixed" | "Percentage" | null;
  supplierName?: string | null;
  branchId?: number | null;
  additionalInfo?: string | null;
  referenceNumber?: string | null;
  expensePeriodStart?: string | null;
  expensePeriodEnd?: string | null;
};

export type CreateExpenseRequest = {
  expenseDate: string;
  expenseCategoryId: number;
  lines: CreateExpenseLineRequest[];
};

export type UserRow = {
  id: number;
  username: string;
  role: string;
  roleId: number;
  branch: string;
  branchId: number;
  createdAt: string;
};

export type UserRequest = {
  username: string;
  password?: string | null;
  roleId: number;
  branchId: number;
};

export type SaleTypeValue = 1 | 2;

export type SaleRow = {
  id: number;
  name: string;
  type: SaleTypeValue | "Percentage" | "FixedAmount";
  value: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  isActiveNow: boolean;
  variantCount: number;
};

export type SaleRequest = {
  name: string;
  type: SaleTypeValue;
  value: number;
  startDate: string;
  endDate: string;
};

/* ------------------------------ dashboard ------------------------------ */

export type DashboardRevenuePoint = { date: string; subtotal: number };
export type DashboardTopProduct = { productName: string; quantitySold: number };
export type DashboardExpenseSummary = {
  draftedCount: number;
  partiallyPaidCount: number;
  fullyPaidCount: number;
  remainingByCurrency: {
    currencyId: number | null;
    currencyCode: string | null;
    currencySymbol: string | null;
    amount: number;
  }[];
};

export type DashboardStockSummary = {
  lowStockVariants: {
    variantId: number;
    sku: string;
    productName: string;
    branchId: number;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
  }[];
  outOfStockVariants: {
    variantId: number;
    sku: string;
    productName: string;
    branchId: number;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
  }[];
  transferInTransit: unknown[];
  latestTransfers: unknown[];
};

export type BranchPerformance = {
  branchId: number;
  branchName: string;
  orderCount: number;
  revenue: number;
  averageBasket: number;
};

export type CreateOrderRequest = {
  customerId: number;
  deliveryLocationId: number;
  createdByEmployeeId: number;
  discountType: 0 | 1 | 2;
  discountValue: number;
  items: { productVariantId: number; quantity: number }[];
};

export type CreateOrderResponse = { orderId: number; invoiceId: number };

export type PaymentRequest = {
  amount: number;
  method: string;
  reference: string;
  currencyId: number;
};

export type ReturnRequest = {
  reason: string;
  items: { invoiceItemId: number; quantity: number; reason: string }[];
};

/* ------------------------------- catalog -------------------------------- */

export type Brand = { id: number; name: string; productCount?: number };

export type Category = { id: number; name: string; productCount?: number };

export type AttributeValue = { id: number; value: string; productAttributeId?: number };

export type ProductAttribute = { id: number; name: string; values: AttributeValue[] };

export type ProductAssignedAttribute = {
  attributeId: number;
  name: string;
  values: AttributeValue[];
};

export type ProductSummary = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  brandId: number | null;
  brandName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  attributes: ProductAssignedAttribute[] | null;
  createdAt?: string | null;
};

export type ProductDetail = ProductSummary;

export type ProductRequest = {
  name: string;
  description: string | null;
  imageUrl: string | null;
  brandId: number | null;
  categoryId: number | null;
  attributeIds: number[];
};

export type ProductVariantAttribute = {
  attributeId?: number;
  name: string;
  valueId?: number;
  value: string;
};

export type ProductVariantRow = {
  id: number;
  sku: string;
  barcode?: string | null;
  imageUrl: string | null;
  productImageUrl?: string | null;
  productName?: string;
  brandName?: string | null;
  categoryName?: string | null;
  saleName?: string | null;
  price: number;
  netPrice: number;
  isSellable?: boolean;
  stockQuantity?: number;
  createdAt?: string | null;
  attributes: ProductVariantAttribute[] | null;
  lowStockBranches?:
    { branchId: number; branchName: string; stockQuantity: number; reorderLevel: number }[] | null;
};

export type VariantCreateRequest = {
  productId: number;
  barcode?: string | null;
  imageUrl?: string | null;
  price: number;
  netPrice: number;
  saleId?: number | null;
  attributes: { attributeId: number; valueId: number }[];
};

export type VariantPatchRequest = Partial<Omit<VariantCreateRequest, "productId">>;

/* ------------------------------ inventory -------------------------------- */

export type InventoryLotBranch = {
  branchId: number;
  branchName: string;
  quantity: number;
  lastUpdated?: string | null;
};

export type InventoryLotRow = {
  id: number;
  productVariantId: number;
  sku: string | null;
  productName: string | null;
  lotNumber: string;
  manufacturingDate: string | null;
  expiryDate: string | null;
  receivedAt: string;
  totalQuantity: number;
  branches: InventoryLotBranch[] | null;
};

export type InventoryLotDetail = {
  id: number;
  variantId: number;
  sku: string | null;
  productName: string | null;
  lotNumber: string;
  manufacturingDate: string | null;
  expiryDate: string | null;
  receivedAt: string;
  totalQuantity: number;
};

export type LotCreateRequest = {
  variantId: number;
  lotNumber: string;
  manufacturingDate: string | null;
  expiryDate: string | null;
};

export type AdjustmentRow = {
  id: number;
  branchId: number;
  branchName: string | null;
  variantId: number;
  inventoryLotId: number;
  lotNumber: string | null;
  sku: string | null;
  productName: string | null;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string | null;
  createdAt: string;
};

export type AdjustmentRequest = {
  variantId: number;
  branchId: number;
  inventoryLotId: number;
  quantity: number;
  reason: string;
};

export type StockMovementRow = {
  productName: string | null;
  sku: string | null;
  movementType: string | null;
  quantity: number;
  createdAt: string;
  reason: string | null;
  branchId: number;
  branchName: string | null;
  inventoryLotId: number | null;
  lotNumber: string | null;
  expiryDate: string | null;
};

export type VariantLocationStock = {
  variantId: number;
  sku: string | null;
  barcode: string | null;
  price: number;
  attributes: { name: string; value: string }[] | null;
  stockPerBranch:
    | {
        branchId: number;
        branchName: string;
        stockQuantity: number;
        reorderLevel: number;
        isLowStock: boolean;
      }[]
    | null;
};

/* ------------------------------ transfers -------------------------------- */

export type TransferItemLot = {
  inventoryLotId: number;
  lotNumber: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  quantitySent: number;
  quantityReceived: number;
};

export type TransferItem = {
  id: number;
  productVariantId: number;
  productName?: string | null;
  sku?: string | null;
  variantSKU?: string | null;
  barcode?: string | null;
  attributes?: string[] | null;
  quantityRequested: number;
  quantitySent: number;
  quantityReceived: number;
  discrepancy?: number;
  receivingNotes?: string | null;
  lots: TransferItemLot[] | null;
};

export type TransferRow = {
  id: number;
  sourceBranchId: number | null;
  sourceBranch: string | null;
  destinationBranchId: number;
  destinationBranch: string | null;
  status: string | { id?: number; name?: string } | null;
  statusId?: number | null;
  createdAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdBy: string | { id?: number; username?: string } | null;
  itemCount?: number;
  hasDiscrepancy: boolean;
  isResolved: boolean;
  resolutionNote: string | null;
  items: TransferItem[] | null;
};

export type TransferStatistics = {
  totalTransfers: number;
  thisMonthTransfers: number;
  byStatus: { status: string; count: number }[] | null;
};

export type TransferCreateRequest = {
  sourceBranchId: number | null;
  destinationBranchId: number;
  notes: string | null;
  items: { productVariantId: number; quantity: number }[];
};

export type TransferDispatchRequest = {
  sourceBranchId: number;
  notes?: string | null;
  lots: { stockTransferItemId: number; inventoryLotId: number; quantity: number }[];
};

export type TransferReceiptRequest = {
  notes?: string | null;
  complete: boolean;
  lots: { stockTransferItemId: number; inventoryLotId: number; quantityReceived: number }[];
};
