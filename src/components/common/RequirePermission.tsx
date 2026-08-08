import type { ReactNode } from "react";

import { AccessDenied } from "./DataStates";
import { useAuth } from "@/features/auth/context/AuthContext";

/** Renders an access-denied panel when the token lacks the permission. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) return <AccessDenied />;
  return <>{children}</>;
}
