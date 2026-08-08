import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, Settings, ShieldCheck } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/i18n";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user, signOut } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/35 p-2 text-start transition-all hover:bg-sidebar-accent/70",
          collapsed && "justify-center border-transparent bg-transparent p-1.5",
        )}
        aria-label={t("common.profile")}
      >
        <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground shadow-sm">
          {initialsOf(user?.username)}
          <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-xs font-semibold text-sidebar-foreground">
                {user?.username}
              </span>
              <span className="mt-0.5 block truncate text-[0.68rem] text-sidebar-foreground/55">
                {user?.roleName ?? user?.branchName ?? ""}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/45 transition-colors group-hover:text-sidebar-foreground/70" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={dir === "rtl" ? "left" : "right"}
        align="end"
        sideOffset={10}
        className="w-64 p-2"
      >
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            {initialsOf(user?.username)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{user?.username}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <ShieldCheck className="size-3" />
              {user?.roleName ?? "—"}
            </p>
            {user?.branchName && (
              <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">
                {user.branchName}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem onSelect={() => void navigate({ to: "/profile" })}>
          <Settings className="size-4" />
          {t("profile.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => void handleSignOut()}
        >
          <LogOut className="size-4" />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
