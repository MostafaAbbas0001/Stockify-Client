import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ProductsScreen } from "@/features/catalog/ProductsScreen";

export const Route = createFileRoute("/_app/products/")({
  head: () => ({
    meta: [
      { title: "Products — Stockify" },
      {
        name: "description",
        content:
          "Browse and manage the Stockify product catalog: brands, categories, tracking rules and variant attributes.",
      },
      { property: "og:title", content: "Products — Stockify" },
      { property: "og:description", content: "The Stockify product catalog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsRoute,
});

function ProductsRoute() {
  return (
    <RequirePermission permission={TAB.products}>
      <ProductsScreen />
    </RequirePermission>
  );
}
