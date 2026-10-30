import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { MovementsScreen } from "@/features/inventory/movements/screens/MovementsScreen";

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
