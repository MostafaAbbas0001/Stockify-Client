import { createFileRoute } from "@tanstack/react-router";

import { PosScreen } from "@/features/pos/PosScreen";
import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";

export const Route = createFileRoute("/_app/pos")({
  head: () => ({
    meta: [
      { title: "Point of Sale — Stockify" },
      {
        name: "description",
        content: "Scan barcodes, build carts and take payment in one fast point-of-sale screen.",
      },
      { property: "og:title", content: "Point of Sale — Stockify" },
      {
        property: "og:description",
        content: "Fast retail checkout with barcode scanning, discounts and instant invoicing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PosRoute,
});

function PosRoute() {
  return (
    <RequirePermission permission={TAB.pos}>
      <PosScreen />
    </RequirePermission>
  );
}
