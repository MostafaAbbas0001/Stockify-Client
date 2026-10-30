import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { CustomersScreen } from "@/features/people/customers/screens/CustomersScreen";

export const Route = createFileRoute("/_app/customers/")({
  component: CustomersRoute,
});

function CustomersRoute() {
  return (
    <RequirePermission permission={TAB.customers}>
      <CustomersScreen />
    </RequirePermission>
  );
}
