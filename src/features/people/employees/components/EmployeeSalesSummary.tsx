import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Card, CardHeader } from "@/shared/components/Surface";
import { ErrorState } from "@/shared/components/DataStates";
import { useI18n } from "@/shared/i18n";
import { employeesApi } from "@/features/people/employees/api";
import { endOfDayIso, formatMoney, startOfDayIso, toDateInput } from "@/shared/lib/format";
import { Input } from "@/shared/ui/input";

/** Fully-paid sales attributed to an employee over a date range. */
export function EmployeeSalesSummary({
  employeeId,
  employeeName,
}: {
  employeeId: number;
  employeeName: string;
}) {
  const { t, locale } = useI18n();
  const today = toDateInput(new Date());
  const monthStart = toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);

  const summary = useQuery({
    queryKey: ["employees", "sales-summary", employeeId, start, end],
    queryFn: () => employeesApi.salesSummary(employeeId, startOfDayIso(start), endOfDayIso(end)),
    enabled: Boolean(start && end),
  });

  return (
    <Card className="h-fit">
      <CardHeader title={t("employees.salesSummary")} description={employeeName} />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("employees.rangeStart")}
            </span>
            <Input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="w-full"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("employees.rangeEnd")}
            </span>
            <Input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="w-full"
            />
          </label>
        </div>

        {summary.isError ? (
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : (
          <div className="border-t border-border pt-4">
            <p className="text-[13px] text-muted-foreground">{t("employees.totalSales")}</p>
            <p className="mt-1 truncate text-heading-sm font-semibold tabular-nums text-foreground">
              {summary.isPending
                ? t("common.loading")
                : formatMoney(summary.data?.totalSales, locale)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
