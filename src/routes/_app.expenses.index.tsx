import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { ExpensesScreen } from "@/features/finance/expenses/screens/ExpensesScreen";
import { validateExpensesSearch } from "@/features/finance/expenses/search";

export const Route = createFileRoute("/_app/expenses/")({
  validateSearch: validateExpensesSearch,
  component: ExpensesRoute,
});

function ExpensesRoute() {
  return (
    <RequirePermission permission={TAB.expenses}>
      <ExpensesScreen />
    </RequirePermission>
  );
}
