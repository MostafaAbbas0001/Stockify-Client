import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { AttributesScreen } from "@/features/catalog/attributes/screens/AttributesScreen";

export const Route = createFileRoute("/_app/attributes/")({
  component: AttributesRoute,
});

function AttributesRoute() {
  return (
    <RequirePermission permission={TAB.attributes}>
      <AttributesScreen />
    </RequirePermission>
  );
}
