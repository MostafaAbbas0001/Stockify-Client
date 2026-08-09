import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Menu,
  ScanBarcode,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { NAV_SECTIONS } from "./navigation";
import { UserMenu } from "./UserMenu";
import { BrandLogo, BrandMark } from "@/components/common/BrandMark";
import { useAuth } from "@/features/auth/context/AuthContext";
import { TAB } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label={t("nav.workspace")}>
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
                    "group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[0.82rem] font-medium transition-[background-color,color,transform]",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-2 start-0 w-[3px] rounded-full bg-sidebar-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <item.icon
                    className={cn("size-[1.05rem] shrink-0", active && "text-sidebar-primary")}
                  />
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
  return (
    <div
      className={cn(
        "flex h-20 w-full shrink-0 items-center justify-center border-b border-sidebar-border/70 px-3",
        collapsed && "px-2",
      )}
    >
      {collapsed ? <BrandMark className="size-12" /> : <BrandLogo className="h-14 w-56" />}
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
            className="pointer-events-auto grid size-7 place-items-center text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary"
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
            className="pointer-events-auto grid size-7 place-items-center text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary"
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
  const { user, can } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentItem = NAV_SECTIONS.flatMap((section) => section.items).find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

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
          collapsed ? "w-[4.75rem]" : "w-[16.5rem]",
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

      <div
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-0 z-50 transition-[visibility] duration-200 lg:hidden",
          mobileOpen ? "visible pointer-events-auto" : "invisible pointer-events-none delay-200",
        )}
      >
        <button
          type="button"
          aria-label={t("common.close")}
          tabIndex={mobileOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-foreground/45 backdrop-blur-sm transition-opacity duration-200 ease-linear",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 start-0 flex w-72 flex-col border-e border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-200 ease-linear",
            mobileOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full",
          )}
        >
          <div className="flex items-center">
            <Brand collapsed={false} />
          </div>
          <ScrollableNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          <div className="shrink-0 border-t border-sidebar-border/70 p-3">
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="relative flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur-xl sm:px-5 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-10 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-primary lg:hidden"
              aria-label={t("nav.workspace")}
            >
              <Menu className="size-5" />
            </button>
            <span className="hidden shrink-0 text-primary sm:block lg:hidden">
              {currentItem ? <currentItem.icon className="size-4" /> : <Store className="size-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground sm:text-[0.95rem]">
                {currentItem ? t(currentItem.labelKey) : t("common.appName")}
              </p>
              <p className="hidden truncate text-[0.7rem] text-muted-foreground sm:block">
                {user?.branchName ?? t("nav.workspace")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.branchName && (
              <span className="hidden items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm md:inline-flex">
                <Store className="size-3.5 text-primary" />
                {user.branchName}
              </span>
            )}
            {can(TAB.pos) && !pathname.startsWith("/pos") && (
              <Link
                to="/pos"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
              >
                <ScanBarcode className="size-4" />
                <span className="hidden sm:inline">{t("nav.pos")}</span>
              </Link>
            )}
          </div>
        </header>

        <main
          className={cn(
            "app-main flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain",
            flush ? "" : "p-4 sm:p-5 lg:p-6 xl:p-8",
          )}
        >
          <div
            key={pathname}
            className="flex min-h-0 min-w-0 flex-1 flex-col animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out motion-reduce:animate-none"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
