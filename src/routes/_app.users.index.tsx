import { createFileRoute } from "@tanstack/react-router";

import { RequirePermission } from "@/shared/components/RequirePermission";
import { TAB } from "@/features/auth/permissions";
import { UsersScreen } from "@/features/people/users/screens/UsersScreen";
import { validateUsersSearch } from "@/features/people/users/search";

export const Route = createFileRoute("/_app/users/")({
  validateSearch: validateUsersSearch,
  component: UsersRoute,
});

function UsersRoute() {
  return (
    <RequirePermission permission={TAB.users}>
      <UsersScreen />
    </RequirePermission>
  );
}
