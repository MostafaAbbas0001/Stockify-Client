import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { FormDialog } from "@/shared/components/FormDialog";
import { Card, CardHeader, PageHeader } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useI18n } from "@/shared/i18n";
import { attributesApi } from "@/features/catalog/attributes/api";
import { attributeKeys } from "@/features/catalog/attributes/queries";
import { isApiError } from "@/shared/api/errors";
import type { AttributeValue, ProductAttribute } from "@/features/catalog/attributes/types";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { FormError } from "@/shared/ui/field";

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
    void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
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
    <div className="space-y-4">
      <PageHeader
        title={t("attributes.title")}
        description={t("attributes.subtitle")}
        actions={
          can(PERM.attributeCreate) && (
            <Button type="button" onClick={() => openForm(null)} className="shrink-0">
              <Plus className="size-4" />
              {t("attributes.newAttribute")}
            </Button>
          )
        }
      />

      {list.isPending ? (
        <Card>
          <div>
            <LoadingState />
          </div>
        </Card>
      ) : list.isError ? (
        <Card>
          <div>
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          </div>
        </Card>
      ) : (list.data ?? []).length === 0 ? (
        <Card>
          <div>
            <EmptyState title={t("attributes.noAttributes")} />
          </div>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
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
        size="md"
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
        <FormError>{formError}</FormError>
        <label className="block space-y-1.5">
          <span className="block text-[13px] font-medium text-foreground">{t("common.name")}</span>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full"
          />
        </label>
        {!editing && (
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground">
              {t("attributes.initialValues")}
            </span>
            <Textarea
              rows={5}
              value={valuesText}
              onChange={(event) => setValuesText(event.target.value)}
              className="w-full"
            />
            <span className="block text-xs text-muted-foreground">
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
              <Button
                type="button"
                aria-label={t("common.edit")}
                onClick={onEdit}
                variant="quiet"
                size="icon-sm"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {can(PERM.attributeDelete) && (
              <Button
                type="button"
                aria-label={t("common.delete")}
                onClick={onDelete}
                variant="quiet-destructive"
                size="icon-sm"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-3 p-4">
        <FormError>{error}</FormError>

        {attribute.values.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("attributes.noValues")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {attribute.values.map((value) => (
              <li key={value.id}>
                {editingValue?.id === value.id ? (
                  <div className="flex h-9 items-center gap-0.5 rounded-control border border-ring bg-card ps-3 pe-1">
                    <input
                      autoFocus
                      value={valueDraft}
                      onChange={(event) => setValueDraft(event.target.value)}
                      aria-label={t("common.edit")}
                      className="h-full w-28 bg-transparent text-base outline-none sm:text-[13px]"
                    />
                    <Button
                      type="button"
                      aria-label={t("common.save")}
                      disabled={updateValue.isPending || !valueDraft.trim()}
                      onClick={() => updateValue.mutate(value)}
                      variant="quiet"
                      size="icon-sm"
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      aria-label={t("common.cancel")}
                      onClick={() => setEditingValue(null)}
                      variant="quiet"
                      size="icon-sm"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-9 items-center gap-0.5 rounded-control bg-muted ps-3 pe-1 sm:h-8">
                    <span className="pe-1 text-[13px] font-medium text-foreground">
                      {value.value}
                    </span>
                    {canEditValue && (
                      <button
                        type="button"
                        aria-label={t("common.edit")}
                        onClick={() => {
                          setEditingValue(value);
                          setValueDraft(value.value);
                        }}
                        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground sm:size-6"
                      >
                        <Pencil className="size-3" />
                      </button>
                    )}
                    {canDeleteValue && (
                      <button
                        type="button"
                        aria-label={t("common.delete")}
                        onClick={() => onDeleteValue(value)}
                        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-destructive sm:size-6"
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
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("attributes.valuePlaceholder")}
              aria-label={t("attributes.valuePlaceholder")}
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              variant="secondary"
              loading={addValue.isPending}
              disabled={!draft.trim()}
            >
              {!addValue.isPending && <Plus className="size-4" />}
              {t("attributes.addValue")}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
