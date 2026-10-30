import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-surface !border-border !bg-card !px-4 !py-3.5 !text-foreground !shadow-float !font-sans",
          title: "!text-sm !font-medium",
          description: "!text-[13px] !text-muted-foreground",
          icon: "!text-foreground",
          error: "[&_[data-icon]]:!text-destructive",
          success: "[&_[data-icon]]:!text-primary",
          actionButton: "!rounded-control !bg-primary !text-primary-foreground",
          cancelButton: "!rounded-control !bg-muted !text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
