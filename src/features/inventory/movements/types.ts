export type StockMovementRow = {
  productName: string | null;
  sku: string | null;
  movementTypeId: number;
  movementTypeCode: string;
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
