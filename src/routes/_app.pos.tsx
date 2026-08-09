import { createFileRoute } from "@tanstack/react-router";

import { PosScreen } from "@/features/pos/PosScreen";
import { RequirePermission } from "@/components/common/RequirePermission";
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
