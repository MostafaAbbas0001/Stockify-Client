import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { MovementsScreen } from "@/features/inventory/MovementsScreen";

export const Route = createFileRoute("/_app/movements/")({
  component: MovementsRoute,
});

function MovementsRoute() {
  return (
    <RequirePermission permission={TAB.stockMovement}>
      <MovementsScreen />
    </RequirePermission>
  );
}
