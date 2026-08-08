import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/components/common/RequirePermission";
import { PERM, TAB } from "@/features/auth/permissions";
import { NameCrudScreen } from "@/features/catalog/NameCrudScreen";
import { useI18n } from "@/i18n";
import { categoriesApi } from "@/lib/api/endpoints";

export const Route = createFileRoute("/_app/categories/")({
  head: () => ({
    meta: [
      { title: "Categories — Stockify" },
      {
        name: "description",
        content:
          "Organise the Stockify catalog into categories that drive product browsing, POS search and reporting.",
      },
      { property: "og:title", content: "Categories — Stockify" },
      { property: "og:description", content: "Catalog category management in Stockify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesRoute,
});

function CategoriesRoute() {
  return (
    <RequirePermission permission={TAB.categories}>
      <CategoriesScreen />
    </RequirePermission>
  );
}

function CategoriesScreen() {
  const { t } = useI18n();
  return (
    <NameCrudScreen
      queryKey={["categories"]}
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
