import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/app/layout/AppLayout";

/**
 * Pathless layout that gates every in-app screen behind a session and renders
 * the persistent application shell (sidebar + header) around every child route.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});
