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
  paymentStatusCode: string;
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
  paymentMethodId: number;
  paymentMethodCode: string;
  paymentMethodName: string;
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
  statusId: number;
  statusCode: string;
  statusName: string;
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
  lineTypeId: number | null;
  lineTypeCode: string | null;
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
  lineTypeId?: number | null;
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
