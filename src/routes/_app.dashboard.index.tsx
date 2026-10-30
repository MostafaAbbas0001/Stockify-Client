import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { DashboardScreen } from "@/features/finance/dashboard/screens/DashboardScreen";
import { validateDashboardSearch } from "@/features/finance/dashboard/search";

export const Route = createFileRoute("/_app/dashboard/")({
  validateSearch: validateDashboardSearch,
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <RequirePermission permission={TAB.dashboard}>
      <DashboardScreen />
    </RequirePermission>
  );
}
