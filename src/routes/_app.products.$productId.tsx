import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ProductDetailScreen } from "@/features/catalog/products/screens/ProductDetailScreen";

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
