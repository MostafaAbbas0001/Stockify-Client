import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { StockScreen } from "@/features/inventory/stock/screens/StockScreen";

export const Route = createFileRoute("/_app/stock/")({
  component: StockRoute,
});

function StockRoute() {
  return (
    <RequirePermission permission={TAB.stock}>
      <StockScreen />
    </RequirePermission>
  );
}
