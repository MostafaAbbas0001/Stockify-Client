import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { CategoriesScreen } from "@/features/catalog/categories/screens/CategoriesScreen";

export const Route = createFileRoute("/_app/categories/")({
  component: CategoriesRoute,
});

function CategoriesRoute() {
  return (
    <RequirePermission permission={TAB.categories}>
      <CategoriesScreen />
    </RequirePermission>
  );
}
