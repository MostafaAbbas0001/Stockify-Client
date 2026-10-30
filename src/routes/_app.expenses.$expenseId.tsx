import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ExpenseDetailScreen } from "@/features/finance/expenses/screens/ExpenseDetailScreen";

export const Route = createFileRoute("/_app/expenses/$expenseId")({
  component: ExpenseDetailRoute,
});

function ExpenseDetailRoute() {
  const { expenseId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.expenses}>
      <ExpenseDetailScreen expenseId={Number(expenseId)} />
    </RequirePermission>
  );
}
