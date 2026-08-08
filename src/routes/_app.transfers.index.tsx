import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { TransfersScreen } from "@/features/inventory/TransfersScreen";

export const Route = createFileRoute("/_app/transfers/")({
  head: () => ({
    meta: [
      { title: "Transfers — Stockify" },
      {
        name: "description",
        content:
          "Move stock between Stockify branches with controlled dispatch, lot allocation, receipts and discrepancy resolution.",
      },
      { property: "og:title", content: "Transfers — Stockify" },
      { property: "og:description", content: "Branch-to-branch stock transfer workflow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransfersRoute,
});

function TransfersRoute() {
  return (
    <RequirePermission permission={TAB.stockTransfer}>
      <TransfersScreen />
    </RequirePermission>
  );
}
