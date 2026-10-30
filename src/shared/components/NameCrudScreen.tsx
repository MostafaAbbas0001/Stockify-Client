import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { FormDialog } from "@/shared/components/FormDialog";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/shared/i18n";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

type NameRow = { id: number; name: string; productCount?: number };

type Labels = {
  title: string;
  subtitle: string;
  createLabel: string;
  editLabel: string;
  empty: string;
  createdToast: string;
  updatedToast: string;
  deletedToast: string;
  deleteTitle: string;
  deleteBody: string;
};

/**
 * Shared screen for the simple name-only catalog resources (brands, categories).
 * Both endpoints return the full collection unpaged, so filtering is client-side.
 */
export function NameCrudScreen({
  queryKey,
  fetchAll,
  create,
  update,
  remove,
  labels,
  permissions,
  controlledSearch,
  onSearchChange,
}: {
  queryKey: readonly unknown[];
  fetchAll: () => Promise<NameRow[]>;
  create: (body: { name: string }) => Promise<unknown>;
  update: (id: number, body: { name: string }) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  labels: Labels;
  permissions: { create: string; update: string; delete: string };
  controlledSearch?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;
}) {
  const { t } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [localSearch, setLocalSearch] = useState("");
  const search = controlledSearch ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const [editing, setEditing] = useState<NameRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<NameRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const list = useQuery({ queryKey, queryFn: fetchAll });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey });

  const save = useMutation({
    mutationFn: () =>
      editing ? update(editing.id, { name: name.trim() }) : create({ name: name.trim() }),
    onSuccess: () => {
      toast.success(editing ? labels.updatedToast : labels.createdToast);
      invalidate();
      setFormOpen(false);
    },
    onError: (error) => {
      const message = isApiError(error)
        ? (error.fieldErrors?.["Name"]?.[0] ?? error.message)
        : (error as Error).message;
      setFormError(message);
    },
  });

  const destroy = useMutation({
    mutationFn: (id: number) => remove(id),
    onSuccess: () => {
      toast.success(labels.deletedToast);
      invalidate();
      setDeleting(null);
    },
    onError: (error) =>
      setDeleteError(isApiError(error) ? error.message : (error as Error).message),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = list.data ?? [];
    return term ? all.filter((row) => row.name.toLowerCase().includes(term)) : all;
  }, [list.data, search]);

  const openForm = (row: NameRow | null) => {
    setEditing(row);
    setName(row?.name ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={labels.title}
        description={labels.subtitle}
        actions={
          can(permissions.create) && (
            <Button type="button" onClick={() => openForm(null)} className="shrink-0">
              <Plus className="size-4" />
              {labels.createLabel}
            </Button>
          )
        }
      />

      <Card>
        <CardHeader
          title={t("common.search")}
          actions={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("common.search")}
              className="md:w-64"
            />
          }
        />

        {list.isPending ? (
          <div>
            <LoadingState />
          </div>
        ) : list.isError ? (
          <div>
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div>
            <EmptyState filtered={Boolean(search)} title={labels.empty} />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{t("common.name")}</Th>
                <Th align="end" actions>
                  {t("common.actions")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  <Td className="font-medium">{row.name}</Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-1">
                      {can(permissions.update) && (
                        <Button
                          type="button"
                          aria-label={t("common.edit")}
                          onClick={() => openForm(row)}
                          variant="quiet"
                          size="icon-sm"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      {can(permissions.delete) && (
                        <Button
                          type="button"
                          aria-label={t("common.delete")}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(row);
                          }}
                          variant="quiet-destructive"
                          size="icon-sm"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pending={save.isPending}
        title={editing ? labels.editLabel : labels.createLabel}
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (!name.trim()) {
            setFormError(t("common.required"));
            return;
          }
          save.mutate();
        }}
        actions={
          <>
            <Button type="button" onClick={() => setFormOpen(false)} variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        {formError && <FormError>{formError}</FormError>}
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">{t("common.name")}</span>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full"
          />
        </label>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={labels.deleteTitle}
        body={labels.deleteBody}
        confirmLabel={t("common.delete")}
        tone="destructive"
        pending={destroy.isPending}
        error={deleteError}
        onCancel={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        onConfirm={() => deleting && destroy.mutate(deleting.id)}
      />
    </div>
  );
}
