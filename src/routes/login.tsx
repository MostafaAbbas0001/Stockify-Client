import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { firstPermittedRoute } from "@/components/layout/navigation";
import { useI18n } from "@/i18n";
import { isApiError } from "@/lib/api/errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Stockify Retail Operations" },
      {
        name: "description",
        content:
          "Sign in to Stockify to run point of sale, manage orders and invoices, and track multi-branch inventory.",
      },
      { property: "og:title", content: "Sign in — Stockify Retail Operations" },
      {
        property: "og:description",
        content: "Secure access to Stockify point of sale, orders, invoices and inventory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const { status, user, can, signIn, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Once authenticated, land on the first screen the permissions allow.
  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    const target = user.permissions.length === 0 ? "/no-access" : firstPermittedRoute(can);
    navigate({ to: target, replace: true });
  }, [status, user, can, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = t("auth.usernameRequired");
    if (!password) errors.password = t("auth.passwordRequired");
    setFieldError(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn({ username: username.trim(), password });
    } catch (error) {
      if (isApiError(error)) {
        if (error.fieldErrors) {
          const mapped: { username?: string; password?: string } = {};
          const usernameMessage = error.fieldErrors["username"]?.[0];
          const passwordMessage = error.fieldErrors["password"]?.[0];
          if (usernameMessage) mapped.username = usernameMessage;
          if (passwordMessage) mapped.password = passwordMessage;
          setFieldError(mapped);
          if (!usernameMessage && !passwordMessage) setFormError(error.message);
        } else if (error.status === 401) {
          setFormError(t("auth.invalidCredentials"));
        } else if (error.status === 503) {
          setFormError(t("auth.backendUnreachable"));
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(t("auth.backendUnreachable"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-sunken px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
            S
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {t("auth.signInTitle")}
            </h1>
            <p className="text-xs text-muted-foreground">{t("auth.signInSubtitle")}</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          noValidate
        >
          {sessionExpired && (
            <p className="rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-xs text-warning">
              {t("auth.sessionExpired")}
            </p>
          )}
          {formError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive"
            >
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>{formError}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs font-medium text-foreground">
              {t("auth.username")}
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
            {fieldError.username && (
              <p className="text-[0.7rem] text-destructive">{fieldError.username}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-foreground">
              {t("auth.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
            {fieldError.password && (
              <p className="text-[0.7rem] text-destructive">{fieldError.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
