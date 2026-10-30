import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { CustomerDetailScreen } from "@/features/people/customers/screens/CustomerDetailScreen";

export const Route = createFileRoute("/_app/customers/$customerId")({
  component: CustomerDetailRoute,
});

function CustomerDetailRoute() {
  const { customerId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.customers}>
      <CustomerDetailScreen customerId={Number(customerId)} />
    </RequirePermission>
  );
}
