import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Pencil, Phone, Store, UserRound } from "lucide-react";
import { useState } from "react";

import { ErrorState, LoadingState } from "@/shared/components/DataStates";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Card, CardHeader, PageHeader } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { EmployeeFormDialog } from "@/features/people/employees/components/EmployeeFormDialog";
import { EmployeeSalesSummary } from "@/features/people/employees/components/EmployeeSalesSummary";
import { useI18n } from "@/shared/i18n";
import { employeesApi } from "@/features/people/employees/api";
import { Button } from "@/shared/ui/button";

export function EmployeeDetailScreen({ employeeId: id }: { employeeId: number }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);
  const employee = useQuery({
    queryKey: ["employees", id],
    queryFn: () => employeesApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
  if (employee.isPending)
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  if (employee.isError)
    return (
      <Card>
        <ErrorState error={employee.error} onRetry={() => void employee.refetch()} />
      </Card>
    );
  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: t("nav.employees"), to: "/employees" },
          { label: employee.data.name },
        ]}
        title={employee.data.name}
        description={t("employees.profileSubtitle")}
        actions={
          can(PERM.employeeUpdate) && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              {t("common.edit")}
            </Button>
          )
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
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
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
