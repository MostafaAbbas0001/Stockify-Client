import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { BranchesScreen } from "@/features/settings/branches/screens/BranchesScreen";

export const Route = createFileRoute("/_app/branches/")({
  validateSearch: (raw: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
  }),
  component: BranchesRoute,
});

function BranchesRoute() {
  return (
    <RequirePermission permission={TAB.branches}>
      <BranchesScreen />
    </RequirePermission>
  );
}
