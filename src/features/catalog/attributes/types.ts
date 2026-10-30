export type AttributeValue = { id: number; value: string; productAttributeId?: number };

export type ProductAttribute = { id: number; name: string; values: AttributeValue[] };
