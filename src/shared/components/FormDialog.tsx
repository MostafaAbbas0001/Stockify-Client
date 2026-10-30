import type { FormEventHandler, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from "@/shared/ui/dialog";

export function FormDialog({
  open,
  onOpenChange,
  pending = false,
  title,
  description,
  onSubmit,
  children,
  actions,
  size = "sm",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  title: ReactNode;
  description?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  actions: ReactNode;
  size?: DialogSize;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent size={size}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={description ? undefined : "sr-only"}>
              {description ?? title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">{children}</div>

          <DialogFooter>{actions}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
