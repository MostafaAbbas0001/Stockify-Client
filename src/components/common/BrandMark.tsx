import { cn } from "@/lib/utils";

const BRAND_ASSETS = {
  icon: {
    light: "/Stockify_Icon_Light.png",
    dark: "/Stockify_Icon_Dark.png",
  },
  full: {
    light: "/Stockify_Logo_Light_Full.png",
    dark: "/Stockify_Logo_Dark_Full.png",
  },
} as const;

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative grid size-10 shrink-0 place-items-center overflow-hidden", className)}
      aria-hidden="true"
    >
      <img
        src={BRAND_ASSETS.icon.light}
        alt=""
        className="size-full scale-[1.85] object-contain dark:hidden"
      />
      <img
        src={BRAND_ASSETS.icon.dark}
        alt=""
        className="hidden size-full scale-[1.85] object-contain dark:block"
      />
    </span>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative block h-10 w-44 shrink-0 overflow-hidden", className)}
      role="img"
      aria-label="Stockify POS"
    >
      <img
        src={BRAND_ASSETS.full.light}
        alt=""
        className="size-full object-contain object-left dark:hidden rtl:object-right"
      />
      <img
        src={BRAND_ASSETS.full.dark}
        alt=""
        className="hidden size-full object-contain object-left dark:block rtl:object-right"
      />
    </span>
  );
}
