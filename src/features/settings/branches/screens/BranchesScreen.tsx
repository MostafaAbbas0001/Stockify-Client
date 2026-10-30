import { getRouteApi } from "@tanstack/react-router";

import { NameCrudScreen } from "@/shared/components/NameCrudScreen";
import { PERM } from "@/features/auth/permissions";
import { branchKeys } from "@/features/settings/branches/queries";
import { useI18n } from "@/shared/i18n";
import { branchesApi } from "@/features/settings/branches/api";

const routeApi = getRouteApi("/_app/branches/");

export function BranchesScreen() {
  const { t } = useI18n();
  const filters = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  return (
    <NameCrudScreen
      queryKey={branchKeys.all}
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
