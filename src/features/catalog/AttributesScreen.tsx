import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { FormDialog } from "@/components/common/FormDialog";
import { Card, CardHeader, PageHeader } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/i18n";
import { attributesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { AttributeValue, ProductAttribute } from "@/lib/api/types";

const KEY = ["attributes"] as const;

function errorMessage(error: unknown) {
  return isApiError(error) ? error.message : (error as Error).message;
}

/** Attribute definitions plus inline management of their values. */
export function AttributesScreen() {
  const { t } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductAttribute | null>(null);
  const [name, setName] = useState("");
  const [valuesText, setValuesText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProductAttribute | null>(null);
  const [deletingValue, setDeletingValue] = useState<{
    attribute: ProductAttribute;
    value: AttributeValue;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const list = useQuery({ queryKey: KEY, queryFn: attributesApi.list });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
    void queryClient.invalidateQueries({ queryKey: ["reference", "attributes"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const trimmed = name.trim();
      if (editing) return attributesApi.update(editing.id, { name: trimmed });
      const values = Array.from(
        new Set(
          valuesText
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      );
      return attributesApi.create({ name: trimmed, values });
    },
    onSuccess: () => {
      toast.success(editing ? t("attributes.updated") : t("attributes.created"));
      invalidate();
      setFormOpen(false);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const destroy = useMutation({
    mutationFn: (id: number) => attributesApi.remove(id),
    onSuccess: () => {
      toast.success(t("attributes.deleted"));
      invalidate();
      setDeleting(null);
    },
    onError: (error) => setDeleteError(errorMessage(error)),
  });

  const destroyValue = useMutation({
    mutationFn: (payload: { attributeId: number; valueId: number }) =>
      attributesApi.removeValue(payload.attributeId, payload.valueId),
    onSuccess: () => {
      toast.success(t("attributes.valueDeleted"));
      invalidate();
      setDeletingValue(null);
    },
    onError: (error) => setDeleteError(errorMessage(error)),
  });

  const openForm = (attribute: ProductAttribute | null) => {
    setEditing(attribute);
    setName(attribute?.name ?? "");
    setValuesText("");
    setFormError(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("attributes.title")}
        description={t("attributes.subtitle")}
        actions={
          can(PERM.attributeCreate) && (
            <button
              type="button"
              onClick={() => openForm(null)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {t("attributes.newAttribute")}
            </button>
          )
        }
      />

      {list.isPending ? (
        <Card>
          <div className="p-6">
            <LoadingState />
          </div>
        </Card>
      ) : list.isError ? (
        <Card>
          <div className="p-6">
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          </div>
        </Card>
      ) : (list.data ?? []).length === 0 ? (
        <Card>
          <div className="p-6">
            <EmptyState title={t("attributes.noAttributes")} />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(list.data ?? []).map((attribute) => (
            <AttributeCard
              key={attribute.id}
              attribute={attribute}
              onEdit={() => openForm(attribute)}
              onDelete={() => {
                setDeleteError(null);
                setDeleting(attribute);
              }}
              onDeleteValue={(value) => {
                setDeleteError(null);
                setDeletingValue({ attribute, value });
              }}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pending={save.isPending}
        title={editing ? t("attributes.editAttribute") : t("attributes.newAttribute")}
        className="max-w-md"
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
        {!editing && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">
              {t("attributes.initialValues")}
            </span>
            <textarea
              rows={5}
              value={valuesText}
              onChange={(event) => setValuesText(event.target.value)}
              className="w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:border-ring"
            />
            <span className="block text-[0.7rem] text-muted-foreground">
              {t("attributes.initialValuesHint")}
            </span>
          </label>
        )}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("attributes.deleteTitle")}
        body={t("attributes.deleteBody")}
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

      <ConfirmDialog
        open={Boolean(deletingValue)}
        title={t("attributes.deleteValueTitle")}
        body={t("attributes.deleteValueBody")}
        confirmLabel={t("common.delete")}
        tone="destructive"
        pending={destroyValue.isPending}
        error={deleteError}
        onCancel={() => {
          setDeletingValue(null);
          setDeleteError(null);
        }}
        onConfirm={() =>
          deletingValue &&
          destroyValue.mutate({
            attributeId: deletingValue.attribute.id,
            valueId: deletingValue.value.id,
          })
        }
      />
    </div>
  );
}

function AttributeCard({
  attribute,
  onEdit,
  onDelete,
  onDeleteValue,
  onChanged,
}: {
  attribute: ProductAttribute;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteValue: (value: AttributeValue) => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const { can } = useAuth();
  const [draft, setDraft] = useState("");
  const [editingValue, setEditingValue] = useState<AttributeValue | null>(null);
  const [valueDraft, setValueDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addValue = useMutation({
    mutationFn: () => attributesApi.addValue(attribute.id, { value: draft.trim() }),
    onSuccess: () => {
      toast.success(t("attributes.valueCreated"));
      setDraft("");
      setError(null);
      onChanged();
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  const updateValue = useMutation({
    mutationFn: (value: AttributeValue) =>
      attributesApi.updateValue(attribute.id, value.id, { value: valueDraft.trim() }),
    onSuccess: () => {
      toast.success(t("attributes.valueUpdated"));
      setEditingValue(null);
      setError(null);
      onChanged();
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  const canAddValue = can(PERM.attributeValueCreate);
  const canEditValue = can(PERM.attributeValueUpdate);
  const canDeleteValue = can(PERM.attributeValueDelete);

  return (
    <Card className="h-fit">
      <CardHeader
        title={attribute.name}
        actions={
          <div className="flex items-center gap-1">
            {can(PERM.attributeUpdate) && (
              <button
                type="button"
                aria-label={t("common.edit")}
                onClick={onEdit}
                className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            {can(PERM.attributeDelete) && (
              <button
                type="button"
                aria-label={t("common.delete")}
                onClick={onDelete}
                className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        }
      />

      <div className="space-y-3 p-4">
        {error && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {attribute.values.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("attributes.noValues")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {attribute.values.map((value) => (
              <li key={value.id}>
                {editingValue?.id === value.id ? (
                  <div className="flex items-center gap-1 rounded-full border border-input bg-background ps-2">
                    <input
                      autoFocus
                      value={valueDraft}
                      onChange={(event) => setValueDraft(event.target.value)}
                      className="h-8 w-24 bg-transparent text-xs outline-none"
                    />
                    <button
                      type="button"
                      aria-label={t("common.save")}
                      disabled={updateValue.isPending || !valueDraft.trim()}
                      onClick={() => updateValue.mutate(value)}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("common.cancel")}
                      onClick={() => setEditingValue(null)}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1.5">
                    <span className="text-xs font-medium text-foreground">{value.value}</span>
                    {canEditValue && (
                      <button
                        type="button"
                        aria-label={t("common.edit")}
                        onClick={() => {
                          setEditingValue(value);
                          setValueDraft(value.value);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                      </button>
                    )}
                    {canDeleteValue && (
                      <button
                        type="button"
                        aria-label={t("common.delete")}
                        onClick={() => onDeleteValue(value)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {canAddValue && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) addValue.mutate();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("attributes.valuePlaceholder")}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              disabled={addValue.isPending || !draft.trim()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40"
            >
              {addValue.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {t("attributes.addValue")}
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}
