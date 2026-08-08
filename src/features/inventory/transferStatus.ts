import { TransferStatus } from "@/lib/enums";
import type { TransferRow } from "@/lib/api/types";

const NAME_TO_ID: Record<string, number> = {
  draft: TransferStatus.Draft,
  sent: TransferStatus.Sent,
  partiallyreceived: TransferStatus.PartiallyReceived,
  "partially received": TransferStatus.PartiallyReceived,
  completed: TransferStatus.Completed,
  cancelled: TransferStatus.Cancelled,
  canceled: TransferStatus.Cancelled,
};

/** The API returns transfer status as an id, a name, or a lookup object. */
export function transferStatusId(transfer: TransferRow): number | null {
  if (typeof transfer.statusId === "number") return transfer.statusId;
  const raw = transfer.status;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return NAME_TO_ID[raw.trim().toLowerCase()] ?? null;
  if (raw && typeof raw === "object") {
    if (typeof raw.id === "number") return raw.id;
    if (raw.name) return NAME_TO_ID[raw.name.trim().toLowerCase()] ?? null;
  }
  return null;
}

export function transferStatusName(transfer: TransferRow): string {
  const raw = transfer.status;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && raw.name) return raw.name;
  return "";
}

export function transferCreatedBy(transfer: TransferRow): string {
  const raw = transfer.createdBy;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && raw.username) return raw.username;
  return "—";
}
