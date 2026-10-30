import { createFileRoute } from "@tanstack/react-router";

import { PosScreen } from "@/features/sales/pos/screens/PosScreen";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";

export const Route = createFileRoute("/_app/pos")({
  component: PosRoute,
});

function PosRoute() {
  return (
    <RequirePermission permission={TAB.pos}>
      <PosScreen />
    </RequirePermission>
  );
}
