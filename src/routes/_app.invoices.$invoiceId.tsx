import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { InvoiceDetailScreen } from "@/features/sales/invoices/screens/InvoiceDetailScreen";

export const Route = createFileRoute("/_app/invoices/$invoiceId")({
  component: InvoiceDetailRoute,
});

function InvoiceDetailRoute() {
  const { invoiceId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.invoices}>
      <InvoiceDetailScreen invoiceId={Number(invoiceId)} />
    </RequirePermission>
  );
}
