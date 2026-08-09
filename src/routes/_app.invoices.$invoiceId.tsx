import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { InvoiceDetail } from "@/features/invoices/InvoiceDetail";

export const Route = createFileRoute("/_app/invoices/$invoiceId")({
  component: InvoiceDetailRoute,
});

function InvoiceDetailRoute() {
  const { invoiceId } = Route.useParams();
  return (
    <RequirePermission permission={TAB.invoices}>
      <InvoiceDetail invoiceId={Number(invoiceId)} />
    </RequirePermission>
  );
}
