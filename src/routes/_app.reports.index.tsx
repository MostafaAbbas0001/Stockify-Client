import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ReportsScreen } from "@/features/finance/reports/screens/ReportsScreen";

export const Route = createFileRoute("/_app/reports/")({
  component: ReportsRoute,
});

function ReportsRoute() {
  return (
    <RequirePermission permission={TAB.reports}>
      <ReportsScreen />
    </RequirePermission>
  );
}
