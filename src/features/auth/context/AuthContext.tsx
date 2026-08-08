import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearSession,
  decodeClaims,
  loadSession,
  onSessionChange,
  saveSession,
  setSessionExpiredHandler,
  type JwtClaims,
  type StoredSession,
} from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { makePermissionChecker, type PermissionKey } from "../permissions";

export type AuthUser = {
  id: string | null;
  username: string;
  roleId: number | null;
  roleName: string | null;
  branchId: number | null;
  branchName: string | null;
  permissions: string[];
};

type AuthValue = {
  status: "loading" | "authenticated" | "anonymous";
  user: AuthUser | null;
  /** True when the token carries the given permission (or any of them). */
  can: (key: PermissionKey | PermissionKey[]) => boolean;
  signIn: (credentials: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function toUser(claims: JwtClaims): AuthUser {
  return {
    id: claims.userId,
    username: claims.username ?? "",
    roleId: claims.roleId,
    roleName: claims.roleName,
    branchId: claims.branchId,
    branchName: claims.branchName,
    permissions: claims.permissions,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthValue["status"]>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const applySession = useCallback((session: StoredSession | null) => {
    if (!session) {
      setUser(null);
      setStatus("anonymous");
      return;
    }
    setUser(toUser(decodeClaims(session.token)));
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    applySession(loadSession());
    const unsubscribe = onSessionChange(applySession);
    setSessionExpiredHandler(() => setSessionExpired(true));
    return () => {
      unsubscribe();
      setSessionExpiredHandler(null);
    };
  }, [applySession]);

  const signIn = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      const response = await authApi.login({ username, password });
      setSessionExpired(false);
      saveSession({
        token: response.token,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
      });
    },
    [],
  );

  const signOut = useCallback(async () => {
    const session = loadSession();
    if (session?.refreshToken) {
      try {
        await authApi.logout(session.refreshToken);
      } catch {
        // Logout is best effort: the local session is cleared regardless.
      }
    }
    clearSession();
  }, []);

  const can = useMemo(() => makePermissionChecker(user?.permissions ?? []), [user?.permissions]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      can,
      signIn,
      signOut,
      sessionExpired,
      dismissSessionExpired: () => setSessionExpired(false),
    }),
    [status, user, can, signIn, signOut, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
