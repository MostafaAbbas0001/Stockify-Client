import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Card, CardHeader, MoneyRow } from "@/components/common/Surface";
import { ErrorState } from "@/components/common/DataStates";
import { useI18n } from "@/i18n";
import { employeesApi } from "@/lib/api/endpoints";
import { endOfDayIso, formatMoney, startOfDayIso, toDateInput } from "@/lib/format";

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
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("employees.rangeStart")}</span>
            <input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("employees.rangeEnd")}</span>
            <input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            />
          </label>
        </div>

        {summary.isError ? (
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : (
          <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2">
            <MoneyRow
              label={t("employees.totalSales")}
              value={
                summary.isPending
                  ? t("common.loading")
                  : formatMoney(summary.data?.totalSales, locale)
              }
              strong
            />
          </div>
        )}
      </div>
    </Card>
  );
}
