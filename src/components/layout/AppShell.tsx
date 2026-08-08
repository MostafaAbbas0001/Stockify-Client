import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { NAV_SECTIONS } from "./navigation";
import { UserMenu } from "./UserMenu";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="flex flex-col gap-6 px-3 py-4" aria-label={t("nav.workspace")}>
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => can(item.tab));
        if (items.length === 0) return null;
        return (
          <div key={section.labelKey} className="flex flex-col gap-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
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
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-sidebar-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <item.icon className="size-[1.05rem] shrink-0" />
                  {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                  {!collapsed && item.comingSoon && (
                    <span className="ms-auto rounded-full bg-sidebar-accent/70 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
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

function Brand({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border/70 px-4",
        collapsed && "justify-center px-2",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-sm">
        S
      </span>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-semibold tracking-tight text-sidebar-foreground">
            {t("common.appName")}
          </p>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/45">
            {t("nav.workspace")}
          </p>
        </div>
      )}
    </div>
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
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-11 justify-center bg-gradient-to-b from-sidebar via-sidebar/90 to-transparent pt-1">
          <button
            type="button"
            onClick={() => scrollBy(-180)}
            className="pointer-events-auto grid size-7 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground/70 shadow-sm transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            aria-label={t("nav.scrollUp")}
            title={t("nav.scrollUp")}
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      )}

      {canScrollDown && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-11 items-end justify-center bg-gradient-to-t from-sidebar via-sidebar/90 to-transparent pb-1">
          <button
            type="button"
            onClick={() => scrollBy(180)}
            className="pointer-events-auto grid size-7 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground/70 shadow-sm transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            aria-label={t("nav.scrollDown")}
            title={t("nav.scrollDown")}
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const CollapseIcon =
    dir === "rtl"
      ? collapsed
        ? ChevronLeft
        : ChevronRight
      : collapsed
        ? ChevronRight
        : ChevronLeft;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "relative z-20 hidden h-svh shrink-0 border-e border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <Brand collapsed={collapsed} />
        <ScrollableNav collapsed={collapsed} />
        <div className="shrink-0 border-t border-sidebar-border/70 p-3">
          <UserMenu collapsed={collapsed} />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute end-0 top-1/2 z-30 grid size-8 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border border-sidebar-border bg-background text-muted-foreground shadow-md transition-colors hover:border-primary/30 hover:bg-primary hover:text-primary-foreground rtl:-translate-x-1/2"
          aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        >
          <CollapseIcon className="size-4" />
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 flex w-72 flex-col border-e border-sidebar-border bg-sidebar shadow-2xl">
            <div className="flex items-center justify-between">
              <Brand collapsed={false} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="me-3 rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
                aria-label={t("common.close")}
              >
                <X className="size-4" />
              </button>
            </div>
            <ScrollableNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <div className="shrink-0 border-t border-sidebar-border/70 p-3">
              <UserMenu />
            </div>
          </div>
        </div>
      )}

      <div className="relative flex h-svh min-w-0 flex-1 overflow-hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed start-3 top-3 z-40 grid size-10 place-items-center rounded-xl border border-border bg-background/95 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted lg:hidden"
          aria-label={t("nav.workspace")}
        >
          <Menu className="size-5" />
        </button>

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain",
            flush ? "pt-14 lg:pt-0" : "p-4 pt-16 lg:p-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
