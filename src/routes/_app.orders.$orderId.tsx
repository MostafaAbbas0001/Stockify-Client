import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { OrderDetailScreen } from "@/features/sales/orders/screens/OrderDetailScreen";

export const Route = createFileRoute("/_app/orders/$orderId")({
  component: OrderDetailRoute,
});

function OrderDetailRoute() {
  const { orderId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.orders}>
      <OrderDetailScreen orderId={Number(orderId)} />
    </RequirePermission>
  );
}
