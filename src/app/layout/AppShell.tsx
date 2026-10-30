import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Menu, PanelLeft, ScanBarcode, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { NAV_SECTIONS } from "@/app/layout/navigation";
import { UserMenu } from "@/app/layout/UserMenu";
import { BrandLogo, BrandMark } from "@/shared/components/BrandMark";
import { useAuth } from "@/features/auth/context/AuthContext";
import { TAB } from "@/features/auth/permissions";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/ui/variants";

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="flex flex-col gap-4 px-3 py-3" aria-label={t("nav.workspace")}>
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => can(item.tab));
        if (items.length === 0) return null;
        return (
          <div key={section.labelKey} className="flex flex-col gap-0.5">
            {collapsed ? (
              <span aria-hidden className="mx-auto mb-1 h-px w-6 bg-border" />
            ) : (
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                {t(section.labelKey)}
              </p>
            )}
            {items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? t(item.labelKey) : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors lg:h-9",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-primary-soft text-primary-strong"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                  {!collapsed && item.comingSoon && (
                    <span className="ms-auto rounded-control bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {t("nav.comingSoon")}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function ScrollableNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setCanScrollUp(element.scrollTop > 2);
    setCanScrollDown(element.scrollTop + element.clientHeight < element.scrollHeight - 2);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateScrollIndicators();
    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(element);
    if (element.firstElementChild) resizeObserver.observe(element.firstElementChild);

    return () => resizeObserver.disconnect();
  }, [collapsed, updateScrollIndicators]);

  const scrollBy = (distance: number) => {
    scrollRef.current?.scrollBy({ top: distance, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={updateScrollIndicators}
        className="scrollbar-none h-full overflow-y-auto overscroll-contain"
      >
        <NavList collapsed={collapsed} {...(onNavigate ? { onNavigate } : {})} />
      </div>

      {canScrollUp && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-10 justify-center bg-sidebar pt-1 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
          <button
            type="button"
            onClick={() => scrollBy(-180)}
            className="pointer-events-auto grid size-7 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("nav.scrollUp")}
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      )}

      {canScrollDown && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-10 items-end justify-center bg-sidebar pb-1 [mask-image:linear-gradient(to_top,black_60%,transparent)]">
          <button
            type="button"
            onClick={() => scrollBy(180)}
            className="pointer-events-auto grid size-7 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("nav.scrollDown")}
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  const { t, dir } = useI18n();
  const { can } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showPosShortcut = can(TAB.pos) && !pathname.startsWith("/pos");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar: one tonal step lighter than the canvas, no divider line. */}
      <aside
        data-slot="sidebar"
        className={cn(
          "hidden h-svh shrink-0 flex-col bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-2 px-5",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <BrandMark /> : <BrandLogo />}
        </div>
        <ScrollableNav collapsed={collapsed} />
        <div className="shrink-0 space-y-1 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-control px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          >
            <PanelLeft className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden />
            {!collapsed && <span className="truncate">{t("nav.collapseSidebar")}</span>}
          </button>
          <UserMenu collapsed={collapsed} />
        </div>
      </aside>

      {/* Phone/tablet navigation sheet. */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "visible" : "invisible delay-200",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label={t("common.close")}
          tabIndex={mobileOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.workspace")}
          className={cn(
            "absolute inset-y-0 start-0 flex w-[min(18rem,86vw)] flex-col rounded-e-surface bg-sidebar pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-float transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 ps-5 pe-3">
            <BrandLogo />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              tabIndex={mobileOpen ? 0 : -1}
              className="grid size-10 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("common.close")}
            >
              <X className="size-5" />
            </button>
          </div>
          <ScrollableNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          <div className="shrink-0 p-3">
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-2 pt-[env(safe-area-inset-top)] sm:px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-control text-foreground transition-colors hover:bg-muted"
            aria-label={t("nav.workspace")}
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" />
          </button>
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center"
            aria-label={t("common.appName")}
          >
            <BrandLogo />
          </Link>
          {showPosShortcut && (
            <Link to="/pos" className={buttonVariants({ size: "sm", className: "h-10" })}>
              <ScanBarcode className="size-4" />
              {t("nav.pos")}
            </Link>
          )}
        </header>

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable_both-edges]",
            !flush && "px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 lg:p-6",
          )}
        >
          <div
            key={pathname}
            className="flex min-h-0 w-full min-w-0 flex-1 flex-col animate-in fade-in-0 duration-150"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
