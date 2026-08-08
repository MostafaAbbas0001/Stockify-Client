import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { MovementsScreen } from "@/features/inventory/MovementsScreen";

export const Route = createFileRoute("/_app/movements/")({
  head: () => ({
    meta: [
      { title: "Movement ledger — Stockify" },
      {
        name: "description",
        content:
          "Audit every stock movement in Stockify: sales, returns, manual adjustments and branch transfers with lot detail.",
      },
      { property: "og:title", content: "Movement ledger — Stockify" },
      { property: "og:description", content: "Read-only record of every stock change." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MovementsRoute,
});

function MovementsRoute() {
  return (
    <RequirePermission permission={TAB.stockMovement}>
      <MovementsScreen />
    </RequirePermission>
  );
}
