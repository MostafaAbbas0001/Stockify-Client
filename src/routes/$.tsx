import { createFileRoute } from "@tanstack/react-router";

import { NotFoundScreen } from "@/app/NotFoundScreen";

export const Route = createFileRoute("/$")({
  component: NotFoundScreen,
});
