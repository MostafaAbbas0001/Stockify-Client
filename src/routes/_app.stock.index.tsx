import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { StockScreen } from "@/features/inventory/StockScreen";

export const Route = createFileRoute("/_app/stock/")({
  head: () => ({
    meta: [
      { title: "Stock — Stockify" },
      {
        name: "description",
        content:
          "Track inventory lots, per-branch balances and manual stock adjustments across every Stockify branch.",
      },
      { property: "og:title", content: "Stock — Stockify" },
      {
        property: "og:description",
        content: "Inventory lots, branch balances and adjustment audit trail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StockRoute,
});

function StockRoute() {
  return (
    <RequirePermission permission={TAB.stock}>
      <StockScreen />
    </RequirePermission>
  );
}
