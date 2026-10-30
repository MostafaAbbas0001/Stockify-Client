import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { BrandsScreen } from "@/features/catalog/brands/screens/BrandsScreen";

export const Route = createFileRoute("/_app/brands/")({
  component: BrandsRoute,
});

function BrandsRoute() {
  return (
    <RequirePermission permission={TAB.brands}>
      <BrandsScreen />
    </RequirePermission>
  );
}
