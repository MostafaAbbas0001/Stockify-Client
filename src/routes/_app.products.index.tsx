import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ProductsScreen } from "@/features/catalog/ProductsScreen";

export const Route = createFileRoute("/_app/products/")({
  component: ProductsRoute,
});

function ProductsRoute() {
  return (
    <RequirePermission permission={TAB.products}>
      <ProductsScreen />
    </RequirePermission>
  );
}
