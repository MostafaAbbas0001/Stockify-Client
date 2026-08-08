import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { AttributesScreen } from "@/features/catalog/AttributesScreen";

export const Route = createFileRoute("/_app/attributes/")({
  head: () => ({
    meta: [
      { title: "Attributes — Stockify" },
      {
        name: "description",
        content:
          "Define the variant dimensions Stockify products use — colour, size, material — and manage their values.",
      },
      { property: "og:title", content: "Attributes — Stockify" },
      {
        property: "og:description",
        content: "Variant attributes and values for the Stockify catalog.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttributesRoute,
});

function AttributesRoute() {
  return (
    <RequirePermission permission={TAB.attributes}>
      <AttributesScreen />
    </RequirePermission>
  );
}
