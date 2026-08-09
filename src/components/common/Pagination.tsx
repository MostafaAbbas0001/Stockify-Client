import { ChevronLeft, ChevronRight } from "lucide-react";

import { useI18n } from "@/i18n";
import { formatNumber } from "@/lib/format";

export function Pagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const { t, locale } = useI18n();
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 px-4 py-4 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        {formatNumber(totalCount, locale)} {t("common.results")}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
          aria-label={t("common.previous")}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
        <span className="text-xs font-medium text-foreground">
          {t("common.page")} {formatNumber(page, locale)} {t("common.of")}{" "}
          {formatNumber(Math.max(totalPages, 1), locale)}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
          aria-label={t("common.next")}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
