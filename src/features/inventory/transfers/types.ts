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
  statusId: number;
  statusCode: string;
  status: string | null;
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
  byStatus: { statusCode: string; status: string; count: number }[] | null;
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
