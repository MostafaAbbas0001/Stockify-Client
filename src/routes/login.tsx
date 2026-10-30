import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "@/features/auth/screens/LoginScreen";

export const Route = createFileRoute("/login")({
  component: LoginScreen,
});
