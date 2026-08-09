import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { FormDialog } from "@/components/common/FormDialog";
import { SearchInput } from "@/components/common/SearchInput";
import { Card, CardHeader, PageHeader, TableShell, Td, Th } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useI18n } from "@/i18n";
import { isApiError } from "@/lib/api/errors";

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

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["reference"] });
  };

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
    <div className="space-y-6">
      <PageHeader
        title={labels.title}
        description={labels.subtitle}
        actions={
          can(permissions.create) && (
            <button
              type="button"
              onClick={() => openForm(null)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {labels.createLabel}
            </button>
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
              className="min-w-56"
            />
          }
        />

        {list.isPending ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : list.isError ? (
          <div className="p-6">
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState filtered={Boolean(search)} title={labels.empty} />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{t("common.name")}</Th>
                <Th align="end">{t("common.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  <Td className="font-medium">{row.name}</Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-1">
                      {can(permissions.update) && (
                        <button
                          type="button"
                          aria-label={t("common.edit")}
                          onClick={() => openForm(row)}
                          className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      {can(permissions.delete) && (
                        <button
                          type="button"
                          aria-label={t("common.delete")}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(row);
                          }}
                          className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
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
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("common.save")}
            </button>
          </>
        }
      >
        {formError && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {formError}
          </p>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">{t("common.name")}</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
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
