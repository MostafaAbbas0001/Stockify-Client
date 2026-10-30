import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { EmployeeDetailScreen } from "@/features/people/employees/screens/EmployeeDetailScreen";

export const Route = createFileRoute("/_app/employees/$employeeId")({
  component: EmployeeDetailRoute,
});

function EmployeeDetailRoute() {
  const { employeeId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.employees}>
      <EmployeeDetailScreen employeeId={Number(employeeId)} />
    </RequirePermission>
  );
}
