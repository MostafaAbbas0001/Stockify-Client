import { toApiError, ApiError } from "./errors";

/**
 * All backend calls go through the same-origin passthrough route so the app does
 * not depend on backend CORS configuration.
 * Override with VITE_API_URL when the backend is configured for cross-origin use.
 */
const CONFIGURED_BASE = import.meta.env["VITE_API_URL"] as string | undefined;

export const API_BASE = (CONFIGURED_BASE?.replace(/\/+$/, "") ?? "/api/public/backend").replace(
  /\/+$/,
  "",
);

const STORAGE_KEY = "stockify.session";

export type StoredSession = {
  token: string;
  refreshToken: string;
  expiresAt: string;
};

type Listener = (session: StoredSession | null) => void;

let memorySession: StoredSession | null = null;
const listeners = new Set<Listener>();

function readStorage(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.token || !parsed.refreshToken) return null;
    return {
      token: parsed.token,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt ?? "",
    };
  } catch {
    return null;
  }
}

export function loadSession(): StoredSession | null {
  if (memorySession) return memorySession;
  memorySession = readStorage();
  return memorySession;
}

export function saveSession(session: StoredSession): void {
  memorySession = session;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  listeners.forEach((listener) => listener(session));
}

export function clearSession(): void {
  memorySession = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((listener) => listener(null));
}

export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type JwtClaims = {
  userId: string | null;
  username: string | null;
  roleId: number | null;
  roleName: string | null;
  branchId: number | null;
  branchName: string | null;
  permissions: string[];
  expiresAtSeconds: number | null;
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return "";
}

function pick(payload: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) return payload[key];
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return null;
}

export function decodeClaims(token: string): JwtClaims {
  const empty: JwtClaims = {
    userId: null,
    username: null,
    roleId: null,
    roleName: null,
    branchId: null,
    branchName: null,
    permissions: [],
    expiresAtSeconds: null,
  };

  const part = token.split(".")[1];
  if (!part) return empty;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(base64UrlDecode(part)) as Record<string, unknown>;
  } catch {
    return empty;
  }

  const rawPerms = pick(payload, ["perms", "permissions", "Permissions"]);
  let permissions: string[] = [];
  if (typeof rawPerms === "string") {
    permissions = rawPerms
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  } else if (Array.isArray(rawPerms)) {
    permissions = rawPerms.map((value) => String(value).trim()).filter(Boolean);
  }

  const rawRole = pick(payload, [
    "role",
    "Role",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  ]);

  return {
    userId: toStringOrNull(
      pick(payload, [
        "sub",
        "nameid",
        "userId",
        "UserId",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      ]),
    ),
    username: toStringOrNull(
      pick(payload, [
        "unique_name",
        "username",
        "name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      ]),
    ),
    roleId: toNumber(pick(payload, ["RoleId", "roleId"])),
    roleName: Array.isArray(rawRole) ? toStringOrNull(rawRole[0]) : toStringOrNull(rawRole),
    branchId: toNumber(pick(payload, ["BranchId", "branchId"])),
    branchName: toStringOrNull(pick(payload, ["BranchName", "branchName"])),
    permissions,
    expiresAtSeconds: toNumber(payload["exp"]),
  };
}

type RefreshResponse = { token: string; refreshToken: string; expiresAt: string };

let refreshInFlight: Promise<StoredSession | null> | null = null;

async function performRefresh(): Promise<StoredSession | null> {
  const current = loadSession();
  if (!current?.refreshToken) return null;

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as RefreshResponse;
  const next: StoredSession = {
    token: data.token,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
  };
  saveSession(next);
  return next;
}

/** Serialized refresh: concurrent 401s share one refresh attempt. */
function refreshOnce(): Promise<StoredSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** Skip the bearer token and refresh flow (login/refresh/logout). */
  anonymous?: boolean;
  /** Return the raw Response (used for .xlsx report downloads). */
  raw?: boolean;
};

export type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  sessionExpiredHandler = handler;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE}/${path.replace(/^\/+/, "")}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

async function send(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  const headers = new Headers({ accept: "application/json" });
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.signal) init.signal = options.signal;

  return fetch(buildUrl(path, options.query), init);
}

export async function apiFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const session = options.anonymous ? null : loadSession();
  let response = await send(path, options, session?.token ?? null);

  if (response.status === 401 && !options.anonymous && session) {
    const refreshed = await refreshOnce();
    if (!refreshed) {
      clearSession();
      sessionExpiredHandler?.();
      throw await toApiError(response);
    }
    response = await send(path, options, refreshed.token);
    if (response.status === 401) {
      clearSession();
      sessionExpiredHandler?.();
      throw await toApiError(response);
    }
  }

  if (!response.ok) throw await toApiError(response);
  return response;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return undefined as T;
  return (await response.json()) as T;
}

export { ApiError };
