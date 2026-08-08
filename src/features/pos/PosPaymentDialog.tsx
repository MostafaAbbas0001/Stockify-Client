import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { CartTotals } from "./usePosCart";
import { MoneyRow } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { currenciesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { invoicesApi, ordersApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { CreateOrderRequest } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

const METHODS = [
  { value: "Cash", labelKey: "pos.payMethodCash" },
  { value: "Card", labelKey: "pos.payMethodCard" },
  { value: "BankTransfer", labelKey: "pos.payMethodTransfer" },
];

export function PosPaymentDialog({
  open,
  onOpenChange,
  totals,
  orderPayload,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totals: CartTotals;
  orderPayload: CreateOrderRequest;
  onCompleted: (result: { orderId: number; invoiceId: number }) => void;
}) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const currencies = useQuery(currenciesQuery());

  const [method, setMethod] = useState("Cash");
  const [received, setReceived] = useState<string>(totals.total.toFixed(2));
  const [reference, setReference] = useState("");
  const [currencyId, setCurrencyId] = useState<number | null>(null);
  const [recordPayment, setRecordPayment] = useState(can(PERM.invoicePaymentAdd));
  const [error, setError] = useState<string | null>(null);

  const activeCurrencies = useMemo(
    () => (currencies.data ?? []).filter((currency) => currency.isActive),
    [currencies.data],
  );
  const effectiveCurrencyId = currencyId ?? activeCurrencies[0]?.id ?? null;
  const currency = activeCurrencies.find((item) => item.id === effectiveCurrencyId);

  const receivedNumber = Number(received);
  const change = Number.isFinite(receivedNumber) ? receivedNumber - totals.total : 0;

  const submit = useMutation({
    mutationFn: async () => {
      const order = await ordersApi.create(orderPayload);
      if (recordPayment && effectiveCurrencyId !== null && receivedNumber > 0) {
        const amount = Math.min(receivedNumber, totals.total);
        try {
          await invoicesApi.addPayment(order.invoiceId, {
            amount,
            method,
            reference,
            currencyId: effectiveCurrencyId,
          });
        } catch (paymentError) {
          // The order exists; surface the payment failure without losing the sale.
          toast.error(
            isApiError(paymentError) ? paymentError.message : (paymentError as Error).message,
          );
        }
      }
      return order;
    },
    onSuccess: (order) => onCompleted(order),
    onError: (mutationError) => {
      if (isApiError(mutationError)) {
        if (mutationError.isConflict) setError(t("pos.insufficientStock"));
        else if (mutationError.fieldErrors) {
          setError(Object.values(mutationError.fieldErrors)[0]?.[0] ?? mutationError.message);
        } else setError(mutationError.message);
      } else {
        setError((mutationError as Error).message);
      }
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-foreground">{t("pos.paymentTitle")}</h3>

        <div className="mt-3 rounded-lg bg-surface-sunken px-3 py-2">
          <MoneyRow
            label={t("common.total")}
            value={formatMoney(totals.total, locale, currency?.symbol)}
            strong
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMethod(option.value)}
                className={
                  method === option.value
                    ? "h-10 rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
                    : "h-10 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted"
                }
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>

          {activeCurrencies.length > 1 && (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">{t("common.currency")}</span>
              <select
                value={effectiveCurrencyId ?? ""}
                onChange={(event) => setCurrencyId(Number(event.target.value))}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
              >
                {activeCurrencies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {can(PERM.invoicePaymentAdd) && (
            <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2">
              <input
                type="checkbox"
                checked={recordPayment}
                onChange={(event) => setRecordPayment(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-xs font-medium text-foreground">
                  {t("pos.recordPaymentNow")}
                </span>
                <span className="block text-[0.68rem] text-muted-foreground">
                  {t("pos.recordPaymentNowHint")}
                </span>
              </span>
            </label>
          )}

          {recordPayment && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-foreground">
                  {t("pos.amountReceived")}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={received}
                  onChange={(event) => setReceived(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-numeric text-base outline-none focus:border-ring"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-foreground">{t("common.reference")}</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                />
              </label>
              <div className="rounded-lg bg-surface-sunken px-3 py-2">
                <MoneyRow
                  label={t("pos.change")}
                  value={formatMoney(Math.max(0, change), locale, currency?.symbol)}
                  tone={change < 0 ? "warning" : "success"}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submit.isPending}
            className="h-11 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              submit.mutate();
            }}
            disabled={submit.isPending}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submit.isPending && <Loader2 className="size-4 animate-spin" />}
            {submit.isPending ? t("pos.creatingOrder") : t("pos.completePayment")}
          </button>
        </div>
      </div>
    </div>
  );
}
