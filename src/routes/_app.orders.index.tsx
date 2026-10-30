import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { OrdersScreen } from "@/features/sales/orders/screens/OrdersScreen";

export const Route = createFileRoute("/_app/orders/")({
  component: OrdersRoute,
});

function OrdersRoute() {
  return (
    <RequirePermission permission={TAB.orders}>
      <OrdersScreen />
    </RequirePermission>
  );
}
