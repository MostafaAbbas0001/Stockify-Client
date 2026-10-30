import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { EmployeesScreen } from "@/features/people/employees/screens/EmployeesScreen";

export const Route = createFileRoute("/_app/employees/")({
  component: EmployeesRoute,
});

function EmployeesRoute() {
  return (
    <RequirePermission permission={TAB.employees}>
      <EmployeesScreen />
    </RequirePermission>
  );
}
