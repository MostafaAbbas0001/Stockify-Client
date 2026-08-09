import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { TransfersScreen } from "@/features/inventory/TransfersScreen";

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
