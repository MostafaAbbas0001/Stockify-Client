import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/shared/i18n";
import { initialsOf } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

function Avatar({ name, className }: { name: string | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

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
          "group flex w-full items-center gap-3 rounded-control p-1.5 text-start transition-colors hover:bg-muted data-[state=open]:bg-muted",
          collapsed && "justify-center",
        )}
        aria-label={t("common.profile")}
      >
        <Avatar name={user?.username} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">
                {user?.username}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user?.tenantName ?? user?.roleName ?? ""}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? (dir === "rtl" ? "left" : "right") : "top"}
        align={collapsed ? "end" : "start"}
        sideOffset={8}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-60"
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar name={user?.username} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user?.username}</p>
            {user?.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
          </div>
        </div>
        <dl className="space-y-1 px-3 pb-2 text-xs">
          {user?.roleName && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("common.role")}</dt>
              <dd className="truncate text-foreground">{user.roleName}</dd>
            </div>
          )}
          {user?.tenantName && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("common.company")}</dt>
              <dd className="truncate text-foreground">{user.tenantName}</dd>
            </div>
          )}
          {user?.branchName && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("common.branch")}</dt>
              <dd className="truncate text-foreground">{user.branchName}</dd>
            </div>
          )}
        </dl>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: "/profile" })}>
          <Settings />
          {t("profile.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive [&>svg]:text-destructive"
          onSelect={() => void handleSignOut()}
        >
          <LogOut />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
