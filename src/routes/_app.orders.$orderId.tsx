import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { OrderDetail } from "@/features/orders/OrderDetail";

export const Route = createFileRoute("/_app/orders/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderId} — Stockify` },
      {
        name: "description",
        content:
          "Review a Stockify order: items, lots, payments and totals, then ship, deliver or cancel it.",
      },
      { property: "og:title", content: `Order ${params.orderId} — Stockify` },
      {
        property: "og:description",
        content: "Order lifecycle, line items and payment history in Stockify.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
