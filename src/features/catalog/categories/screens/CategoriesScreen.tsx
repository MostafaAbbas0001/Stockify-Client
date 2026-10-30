import { PERM } from "@/features/auth/permissions";
import { NameCrudScreen } from "@/shared/components/NameCrudScreen";
import { useI18n } from "@/shared/i18n";
import { categoriesApi } from "@/features/catalog/categories/api";
import { categoryKeys } from "@/features/catalog/categories/queries";

export function CategoriesScreen() {
  const { t } = useI18n();
  return (
    <NameCrudScreen
      queryKey={categoryKeys.all}
      fetchAll={categoriesApi.list}
      create={categoriesApi.create}
      update={categoriesApi.update}
      remove={categoriesApi.remove}
      permissions={{
        create: PERM.categoryCreate,
        update: PERM.categoryUpdate,
        delete: PERM.categoryDelete,
      }}
      labels={{
        title: t("categories.title"),
        subtitle: t("categories.subtitle"),
        createLabel: t("categories.newCategory"),
        editLabel: t("categories.editCategory"),
        empty: t("categories.noCategories"),
        createdToast: t("categories.created"),
        updatedToast: t("categories.updated"),
        deletedToast: t("categories.deleted"),
        deleteTitle: t("categories.deleteTitle"),
        deleteBody: t("categories.deleteBody"),
      }}
    />
  );
}
