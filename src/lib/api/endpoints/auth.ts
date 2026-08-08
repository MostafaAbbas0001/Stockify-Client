import { api } from "../client";
import type { LoginResponse } from "../types";

export const authApi = {
  login: (body: { username: string; password: string }) =>
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
