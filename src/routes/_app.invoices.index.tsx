import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { InvoicesScreen } from "@/features/sales/invoices/screens/InvoicesScreen";

export const Route = createFileRoute("/_app/invoices/")({
  component: InvoicesRoute,
});

function InvoicesRoute() {
  return (
    <RequirePermission permission={TAB.invoices}>
      <InvoicesScreen />
    </RequirePermission>
  );
}
