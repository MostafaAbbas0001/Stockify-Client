import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { TransfersScreen } from "@/features/inventory/transfers/screens/TransfersScreen";

export const Route = createFileRoute("/_app/transfers/")({
  component: TransfersRoute,
});

function TransfersRoute() {
  return (
    <RequirePermission permission={TAB.stockTransfer}>
      <TransfersScreen />
    </RequirePermission>
  );
}
