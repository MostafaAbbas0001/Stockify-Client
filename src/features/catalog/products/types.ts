import type { AttributeValue } from "@/features/catalog/attributes/types";

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
