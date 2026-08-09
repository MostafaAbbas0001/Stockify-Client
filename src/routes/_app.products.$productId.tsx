import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ProductDetailScreen } from "@/features/catalog/ProductDetailScreen";

export const Route = createFileRoute("/_app/products/$productId")({
  component: ProductDetailRoute,
});

function ProductDetailRoute() {
  const { productId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.products}>
      <ProductDetailScreen productId={Number(productId)} />
    </RequirePermission>
  );
}
