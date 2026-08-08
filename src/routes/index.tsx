import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { firstPermittedRoute } from "@/components/layout/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Stockify — Retail POS, Inventory & Order Management" },
      {
        name: "description",
        content:
          "Stockify is the operations workspace for multi-branch retail: fast point of sale, order fulfilment, invoicing, returns and live stock control.",
      },
      { property: "og:title", content: "Stockify — Retail POS, Inventory & Order Management" },
      {
        property: "og:description",
        content:
          "Run checkout, orders, invoices and inventory for every branch from a single Stockify workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexRedirect,
});

/** Sends the visitor to sign-in or to the first screen their permissions allow. */
function IndexRedirect() {
  const { status, user, can } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous" || !user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    navigate({
      to: user.permissions.length === 0 ? "/no-access" : firstPermittedRoute(can),
      replace: true,
    });
  }, [status, user, can, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <h1 className="sr-only">Stockify</h1>
    </div>
  );
}
