import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { PERM, TAB } from "@/features/auth/permissions";
import { NameCrudScreen } from "@/features/catalog/NameCrudScreen";
import { useI18n } from "@/i18n";
import { brandsApi } from "@/lib/api/endpoints";

export const Route = createFileRoute("/_app/brands/")({
  component: BrandsRoute,
});

function BrandsRoute() {
  return (
    <RequirePermission permission={TAB.brands}>
      <BrandsScreen />
    </RequirePermission>
  );
}

function BrandsScreen() {
  const { t } = useI18n();
  return (
    <NameCrudScreen
      queryKey={["brands"]}
      fetchAll={brandsApi.list}
      create={brandsApi.create}
      update={brandsApi.update}
      remove={brandsApi.remove}
      permissions={{
        create: PERM.brandCreate,
        update: PERM.brandUpdate,
        delete: PERM.brandDelete,
      }}
      labels={{
        title: t("brands.title"),
        subtitle: t("brands.subtitle"),
        createLabel: t("brands.newBrand"),
        editLabel: t("brands.editBrand"),
        empty: t("brands.noBrands"),
        createdToast: t("brands.created"),
        updatedToast: t("brands.updated"),
        deletedToast: t("brands.deleted"),
        deleteTitle: t("brands.deleteTitle"),
        deleteBody: t("brands.deleteBody"),
      }}
    />
  );
}
