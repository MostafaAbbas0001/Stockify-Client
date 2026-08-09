import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  Moon,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  Sun,
} from "lucide-react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { firstPermittedRoute } from "@/components/layout/navigation";
import { BrandLogo } from "@/components/common/BrandMark";
import { useI18n } from "@/i18n";
import { isApiError } from "@/lib/api/errors";
import { useTheme } from "@/components/theme/ThemeProvider";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const { resolved, setMode } = useTheme();
  const { status, user, can, signIn, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_35%)]" />
      <div className="absolute end-5 top-5 z-20 flex items-center gap-5 sm:end-8 sm:top-8">
        <button
          type="button"
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          className="text-muted-foreground transition-colors hover:text-primary"
          aria-label="Change language"
        >
          <Languages className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
          className="text-muted-foreground transition-colors hover:text-primary"
          aria-label="Change theme"
        >
          {resolved === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>

      <div className="absolute inset-x-0 top-8 z-10 flex justify-center sm:top-10">
        <BrandLogo className="h-32 w-[32rem] max-w-[82vw]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 items-center gap-12 px-5 pb-14 pt-44 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-16 lg:pt-40 xl:gap-28 xl:px-24">
        <section className="relative hidden w-full max-w-lg justify-self-center text-foreground lg:block">
          <div className="relative max-w-xl">
            <h2 className="max-w-lg text-4xl font-bold leading-[1.08] tracking-[-0.045em] xl:text-5xl">
              {t("auth.platformDescription")}
            </h2>
            <div className="mt-10 grid grid-cols-4 gap-4 text-xs text-muted-foreground">
              {[
                { icon: ShoppingBag, label: t("auth.featureCheckout") },
                { icon: Boxes, label: t("auth.featureInventory") },
                { icon: BarChart3, label: t("auth.featureInsights") },
                { icon: Smartphone, label: t("auth.featureMobilePos") },
              ].map((feature) => (
                <div key={feature.label} className="flex flex-col items-center gap-2 text-center">
                  <feature.icon className="size-6 text-primary" />
                  <span className="whitespace-nowrap leading-relaxed">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full max-w-lg min-w-0 justify-self-center">
          <div className="w-full min-w-0 max-w-lg">
            <div className="mb-7 text-center lg:text-start">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {t("auth.secureAccess")}
              </p>
              <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
                {t("auth.signIn")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-xl shadow-foreground/[0.04] sm:p-7"
              noValidate
            >
              {sessionExpired && (
                <p className="rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-3 text-sm text-warning">
                  {t("auth.sessionExpired")}
                </p>
              )}
              {formError && (
                <p
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-error-soft px-3.5 py-3 text-sm text-destructive"
                >
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>{formError}</span>
                </p>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-semibold text-foreground">
                  {t("auth.username")}
                </label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-background px-3.5 text-base outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15 sm:text-sm"
                />
                {fieldError.username && (
                  <p className="text-xs text-destructive">{fieldError.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-foreground">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-3.5 pe-12 text-base outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 end-0 grid w-12 place-items-center text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {fieldError.password && (
                  <p className="text-xs text-destructive">{fieldError.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </button>
            </form>
          </div>
        </section>
      </div>
      <p className="absolute inset-x-0 bottom-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}
      </p>
    </main>
  );
}
