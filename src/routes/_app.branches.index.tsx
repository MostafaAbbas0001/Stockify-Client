import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { NameCrudScreen } from "@/features/catalog/NameCrudScreen";
import { PERM, TAB } from "@/features/auth/permissions";
import { referenceKeys } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { branchesApi } from "@/lib/api/endpoints";

export const Route = createFileRoute("/_app/branches/")({
  validateSearch: (raw: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof raw["q"] === "string" && raw["q"] ? raw["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Branches — Stockify" },
      { name: "description", content: "Create, rename and deactivate Stockify retail branches." },
      { property: "og:title", content: "Branches — Stockify" },
      { property: "og:description", content: "Multi-branch administration in Stockify." },
    ],
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

function BranchesScreen() {
  const { t } = useI18n();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <NameCrudScreen
      queryKey={referenceKeys.branches}
      fetchAll={branchesApi.list}
      create={branchesApi.create}
      update={branchesApi.update}
      remove={branchesApi.remove}
      controlledSearch={filters.q ?? ""}
      onSearchChange={(q) => void navigate({ search: { q: q || undefined }, replace: true })}
      permissions={{
        create: PERM.branchCreate,
        update: PERM.branchUpdate,
        delete: PERM.branchDelete,
      }}
      labels={{
        title: t("branches.title"),
        subtitle: t("branches.subtitle"),
        createLabel: t("branches.newBranch"),
        editLabel: t("branches.editBranch"),
        empty: t("branches.noBranches"),
        createdToast: t("branches.created"),
        updatedToast: t("branches.updated"),
        deletedToast: t("branches.deleted"),
        deleteTitle: t("branches.deleteTitle"),
        deleteBody: t("branches.deleteBody"),
      }}
    />
  );
}
