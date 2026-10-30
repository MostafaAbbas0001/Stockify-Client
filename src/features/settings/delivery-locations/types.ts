export type DeliveryCharge = {
  id: number;
  locationName: string;
  fee: number;
  /** The company's built-in in-store location; it cannot be deleted. */
  isInStore?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
};
