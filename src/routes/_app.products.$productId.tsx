import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ProductDetailScreen } from "@/features/catalog/ProductDetailScreen";

export const Route = createFileRoute("/_app/products/$productId")({
  head: () => ({
    meta: [
      { title: "Product details — Stockify" },
      {
        name: "description",
        content:
          "Review a Stockify product: tracking rules, assigned attributes and every sellable variant with pricing.",
      },
      { property: "og:title", content: "Product details — Stockify" },
      { property: "og:description", content: "Product and variant details in Stockify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
