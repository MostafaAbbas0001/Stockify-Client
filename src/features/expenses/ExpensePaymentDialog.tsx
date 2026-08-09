import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { expensesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { ExpenseLine } from "@/lib/api/types";
import { formatMoney, toDateInput } from "@/lib/format";

export function ExpensePaymentDialog({
  line,
  onOpenChange,
}: {
  line: ExpenseLine;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const approved = line.payments
    .filter((payment) => payment.approvedAt && !payment.rejectionReason)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, line.totalAmount - approved);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [date, setDate] = useState(toDateInput(new Date()));
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      expensesApi.createPayment({
        expenseLineId: line.id,
        amount: Number(amount),
        paymentDate: new Date(`${date}T12:00:00`).toISOString(),
        paymentMethod: method.trim(),
        paymentReference: reference.trim() || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("expenses.paymentSubmitted"));
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
    },
    onError: (reason) => setError(isApiError(reason) ? reason.message : (reason as Error).message),
  });
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !(Number(amount) > 0) ||
              Number(amount) - remaining > 0.009 ||
              !date ||
              !method.trim()
            ) {
              setError(t("expenses.invalidPayment"));
              return;
            }
            setError(null);
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("expenses.addPayment")}</DialogTitle>
            <DialogDescription>
              {t("expenses.paymentHint", {
                amount: formatMoney(remaining, locale, line.currencySymbol),
              })}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-lg bg-error-soft px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("common.amount")} type="number" value={amount} onChange={setAmount} />
            <Field label={t("common.date")} type="date" value={date} onChange={setDate} />
            <Field label={t("expenses.paymentMethod")} value={method} onChange={setMethod} />
            <Field label={t("expenses.reference")} value={reference} onChange={setReference} />
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium">{t("common.notes")}</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-lg border border-border px-4 text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("expenses.submitPayment")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium">{label}</span>
      <input
        type={type}
        min={type === "number" ? "0.01" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}
