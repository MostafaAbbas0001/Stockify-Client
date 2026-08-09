import type { FormEventHandler, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function FormDialog({
  open,
  onOpenChange,
  pending = false,
  title,
  description,
  onSubmit,
  children,
  actions,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  title: ReactNode;
  description?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className={cn("max-w-sm", className)}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription className={description ? undefined : "sr-only"}>
              {description ?? title}
            </DialogDescription>
          </DialogHeader>

          {children}

          <DialogFooter className="gap-2 pt-1 sm:space-x-0">{actions}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
