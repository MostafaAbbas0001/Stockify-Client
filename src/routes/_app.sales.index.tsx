import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { PromotionsScreen } from "@/features/sales/promotions/screens/PromotionsScreen";
import { validateSalesSearch } from "@/features/sales/promotions/search";

export const Route = createFileRoute("/_app/sales/")({
  validateSearch: validateSalesSearch,
  component: SalesRoute,
});

function SalesRoute() {
  return (
    <RequirePermission permission={TAB.sales}>
      <PromotionsScreen />
    </RequirePermission>
  );
}
