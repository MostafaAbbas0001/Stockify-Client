import { createFileRoute } from "@tanstack/react-router";

import { NoAccessScreen } from "@/features/auth/screens/NoAccessScreen";

export const Route = createFileRoute("/no-access")({
  component: NoAccessScreen,
});
