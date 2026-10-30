import { cn } from "@/shared/lib/utils";

/**
 * The Stockify "S" from the original logo: navy upper stroke, electric-blue lower stroke
 * (--logo-top / --logo-bottom; the dark theme lightens the upper stroke).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="340 250 590 710"
      className={cn("size-8 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="var(--logo-top)"
        d="M560 280Q580 262 610 262L895 262Q925 268 908 305L778 432Q765 444 745 444L545 444Q505 448 500 490Q500 510 518 528L676 684Q688 700 668 702L522 702Q492 700 472 682L388 604Q355 570 355 523Q357 474 388 440Z"
      />
      <path
        fill="var(--logo-bottom)"
        d="M600 510L750 510Q778 512 798 530L880 608Q915 642 915 688Q914 738 882 770L708 932Q690 945 665 945L365 945Q335 940 350 900L476 780Q492 767 512 767L718 767Q752 765 760 728Q765 702 745 684L598 526Q590 510 600 510Z"
      />
    </svg>
  );
}

/** Mark + navy wordmark + the blue "POS" tag, as in the original logo. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-2", className)}
      role="img"
      aria-label="Stockify POS"
    >
      <BrandMark className="size-7" />
      <span aria-hidden className="text-[17px] font-semibold tracking-[-0.03em] text-foreground">
        Stockify
      </span>
      <span
        aria-hidden
        className="rounded-control bg-brand px-1.5 py-px text-[11px] font-semibold tracking-[0.02em] text-brand-foreground"
      >
        POS
      </span>
    </span>
  );
}
