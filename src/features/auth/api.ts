import type { LoginResponse } from "@/features/auth/types";
import { api } from "@/shared/api/client";

export const authApi = {
  login: (body: { email: string; password: string }) =>
    api<LoginResponse>("auth/login", { method: "POST", body, anonymous: true }),
  refresh: (refreshToken: string) =>
    api<LoginResponse>("auth/refresh", {
      method: "POST",
      body: { refreshToken },
      anonymous: true,
    }),
  logout: (refreshToken: string) =>
    api<void>("auth/logout", { method: "POST", body: { refreshToken }, anonymous: true }),
};
