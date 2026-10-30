import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  Languages,
  Moon,
  ShoppingBag,
  Smartphone,
  Sun,
} from "lucide-react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { firstPermittedRoute } from "@/app/layout/navigation";
import { BrandLogo } from "@/shared/components/BrandMark";
import { Card } from "@/shared/components/Surface";
import { useI18n } from "@/shared/i18n";
import { TENANT_SUSPENDED } from "@/shared/api/client";
import { isApiError } from "@/shared/api/errors";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { Button } from "@/shared/ui/button";
import { Field, FormError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export function LoginScreen() {
  const { t, locale, setLocale } = useI18n();
  const { resolved, setMode } = useTheme();
  const { status, user, can, signIn, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
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
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = t("auth.emailRequired");
    if (!password) errors.password = t("auth.passwordRequired");
    setFieldError(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (error) {
      if (isApiError(error)) {
        if (error.fieldErrors) {
          const mapped: { email?: string; password?: string } = {};
          const emailMessage = error.fieldErrors["email"]?.[0];
          const passwordMessage = error.fieldErrors["password"]?.[0];
          if (emailMessage) mapped.email = emailMessage;
          if (passwordMessage) mapped.password = passwordMessage;
          setFieldError(mapped);
          if (!emailMessage && !passwordMessage) setFormError(error.message);
        } else if (error.code === TENANT_SUSPENDED) {
          setFormError(t("auth.companySuspended"));
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

  const features = [
    { icon: ShoppingBag, label: t("auth.featureCheckout") },
    { icon: Boxes, label: t("auth.featureInventory") },
    { icon: BarChart3, label: t("auth.featureInsights") },
    { icon: Smartphone, label: t("auth.featureMobilePos") },
  ];

  return (
    <main className="flex min-h-svh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <header className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
        <BrandLogo />
        <div className="flex items-center gap-1">
          <Button
            variant="quiet"
            size="icon"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            aria-label={locale === "en" ? "العربية" : "English"}
            title={locale === "en" ? "العربية" : "English"}
          >
            <Languages className="size-4" />
          </Button>
          <Button
            variant="quiet"
            size="icon"
            onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
            aria-label={resolved === "dark" ? "Light theme" : "Dark theme"}
          >
            {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-12 px-4 pt-6 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-20 lg:px-12">
        <section className="hidden lg:block">
          <h2 className="max-w-2xl text-heading-lg font-semibold text-foreground xl:text-display">
            {t("auth.platformDescription")}
          </h2>
          <ul className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-4">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-center gap-3 text-sm text-foreground">
                <feature.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {feature.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md lg:mx-0">
          <Card className="p-5 sm:p-7">
            <h1 className="text-heading-sm font-semibold text-foreground">{t("auth.signIn")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {sessionExpired && (
                <p className="rounded-control bg-muted px-3.5 py-2.5 text-[13px] text-foreground">
                  {t("auth.sessionExpired")}
                </p>
              )}
              <FormError>{formError}</FormError>

              <Field label={t("auth.email")} error={fieldError.email}>
                <Input
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={fieldError.email ? true : undefined}
                />
              </Field>

              <Field label={t("auth.password")} error={fieldError.password}>
                <span className="relative block">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={fieldError.password ? true : undefined}
                    className="pe-12"
                  />
                  <Button
                    variant="quiet"
                    size="icon-sm"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 end-1 my-auto"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </span>
              </Field>

              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>
          </Card>
        </section>
      </div>

      <footer className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Stockify
      </footer>
    </main>
  );
}
