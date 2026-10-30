import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ProductsScreen } from "@/features/catalog/products/screens/ProductsScreen";

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
