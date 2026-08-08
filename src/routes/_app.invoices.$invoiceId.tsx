import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { InvoiceDetail } from "@/features/invoices/InvoiceDetail";

export const Route = createFileRoute("/_app/invoices/$invoiceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Invoice ${params.invoiceId} — Stockify` },
      {
        name: "description",
        content:
          "Inspect a Stockify invoice: stored totals, payment history and credit memos, record payments or returns.",
      },
      { property: "og:title", content: `Invoice ${params.invoiceId} — Stockify` },
      {
        property: "og:description",
        content: "Invoice balance, payments and returns in Stockify.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
