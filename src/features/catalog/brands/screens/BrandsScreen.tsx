import { PERM } from "@/features/auth/permissions";
import { NameCrudScreen } from "@/shared/components/NameCrudScreen";
import { useI18n } from "@/shared/i18n";
import { brandsApi } from "@/features/catalog/brands/api";
import { brandKeys } from "@/features/catalog/brands/queries";

export function BrandsScreen() {
  const { t } = useI18n();
  return (
    <NameCrudScreen
      queryKey={brandKeys.all}
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
