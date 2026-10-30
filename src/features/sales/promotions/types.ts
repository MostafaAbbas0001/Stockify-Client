export type SaleRow = {
  id: number;
  name: string;
  saleTypeId: number;
  saleTypeCode: string;
  value: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  isActiveNow: boolean;
  variantCount: number;
};

export type SaleRequest = {
  name: string;
  saleTypeId: number;
  value: number;
  startDate: string;
  endDate: string;
};
