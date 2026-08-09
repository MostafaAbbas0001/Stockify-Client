import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { OrderDetail } from "@/features/orders/OrderDetail";

export const Route = createFileRoute("/_app/orders/$orderId")({
  component: OrderDetailRoute,
});

function OrderDetailRoute() {
  const { orderId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.orders}>
      <OrderDetail orderId={Number(orderId)} />
    </RequirePermission>
  );
}
