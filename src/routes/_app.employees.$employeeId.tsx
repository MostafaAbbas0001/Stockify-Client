import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Store, UserRound } from "lucide-react";
import { useState } from "react";

import { ErrorState, LoadingState } from "@/components/common/DataStates";
import { RequirePermission } from "@/components/common/RequirePermission";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM, TAB } from "@/features/auth/permissions";
import { EmployeeFormDialog } from "@/features/employees/EmployeeFormDialog";
import { EmployeeSalesSummary } from "@/features/employees/EmployeeSalesSummary";
import { useI18n } from "@/i18n";
import { employeesApi } from "@/lib/api/endpoints";

export const Route = createFileRoute("/_app/employees/$employeeId")({
  component: EmployeeDetailRoute,
});
function EmployeeDetailRoute() {
  return (
    <RequirePermission permission={TAB.employees}>
      <EmployeeDetailScreen />
    </RequirePermission>
  );
}
function EmployeeDetailScreen() {
  const id = Number(Route.useParams().employeeId);
  const { t } = useI18n();
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);
  const employee = useQuery({
    queryKey: ["employees", id],
    queryFn: () => employeesApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
  if (employee.isPending) return <LoadingState />;
  if (employee.isError)
    return <ErrorState error={employee.error} onRetry={() => void employee.refetch()} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/employees"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 rtl:rotate-180" />
            {t("employees.back")}
          </Link>
          <h1 className="text-lg font-semibold">{employee.data.name}</h1>
          <p className="text-sm text-muted-foreground">{t("employees.profileSubtitle")}</p>
        </div>
        {can(PERM.employeeUpdate) && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold"
          >
            <Pencil className="size-4" />
            {t("common.edit")}
          </button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader
            title={t("employees.profile")}
            actions={
              <StatusBadge tone={employee.data.isSale ? "success" : "neutral"}>
                {employee.data.isSale ? t("employees.salesperson") : t("employees.staffMember")}
              </StatusBadge>
            }
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Contact icon={UserRound} label={t("common.name")} value={employee.data.name} />
            <Contact
              icon={Store}
              label={t("common.branch")}
              value={employee.data.branchName ?? "—"}
            />
            <Contact icon={Phone} label={t("common.phone")} value={employee.data.phone || "—"} />
            <Contact icon={Mail} label={t("common.email")} value={employee.data.email || "—"} />
            <Contact
              icon={MapPin}
              label={t("common.address")}
              value={employee.data.address || "—"}
            />
          </div>
        </Card>
        <EmployeeSalesSummary employeeId={employee.data.id} employeeName={employee.data.name} />
      </div>
      {editing && (
        <EmployeeFormDialog open={editing} onOpenChange={setEditing} employee={employee.data} />
      )}
    </div>
  );
}
function Contact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
