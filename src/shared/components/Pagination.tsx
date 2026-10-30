import { ChevronLeft, ChevronRight } from "lucide-react";

import { useI18n } from "@/shared/i18n";
import { formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

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
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
      <p className="text-[13px] text-muted-foreground">
        {formatNumber(totalCount, locale)} {t("common.results")}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t("common.previous")}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Button>
        <span className="min-w-20 px-2 text-center text-[13px] tabular text-foreground">
          {formatNumber(page, locale)} / {formatNumber(Math.max(totalPages, 1), locale)}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t("common.next")}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
