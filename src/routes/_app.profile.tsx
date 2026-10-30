import { createFileRoute } from "@tanstack/react-router";

import { ProfileScreen } from "@/features/auth/screens/ProfileScreen";

export const Route = createFileRoute("/_app/profile")({
  component: ProfileScreen,
});
