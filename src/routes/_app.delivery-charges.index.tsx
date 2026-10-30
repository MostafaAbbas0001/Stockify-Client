import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { DeliveryLocationsScreen } from "@/features/settings/delivery-locations/screens/DeliveryLocationsScreen";

export const Route = createFileRoute("/_app/delivery-charges/")({
  validateSearch: (raw: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
  }),
  component: DeliveryChargesRoute,
});

function DeliveryChargesRoute() {
  return (
    <RequirePermission permission={TAB.delivery}>
      <DeliveryLocationsScreen />
    </RequirePermission>
  );
}
