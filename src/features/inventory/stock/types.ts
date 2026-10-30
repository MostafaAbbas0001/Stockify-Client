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
