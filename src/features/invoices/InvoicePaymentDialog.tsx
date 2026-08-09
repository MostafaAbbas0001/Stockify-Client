import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/common/AppSelect";
import { MoneyRow } from "@/components/common/Surface";
import { currenciesQuery } from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { invoicesApi } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";

const METHODS = [
  { value: "Cash", labelKey: "pos.payMethodCash" },
  { value: "Card", labelKey: "pos.payMethodCard" },
  { value: "BankTransfer", labelKey: "pos.payMethodTransfer" },
];

/** Records a payment against an already issued invoice. */
export function InvoicePaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  remaining,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  remaining: number;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const currencies = useQuery({ ...currenciesQuery(), enabled: open });

  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toFixed(2) : "");
  const [received, setReceived] = useState("");
  const [reference, setReference] = useState("");
  const [currencyId, setCurrencyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCurrencies = useMemo(
    () => (currencies.data ?? []).filter((currency) => currency.isActive),
    [currencies.data],
  );
  const effectiveCurrencyId = currencyId ?? activeCurrencies[0]?.id ?? null;
  const currency = activeCurrencies.find((item) => item.id === effectiveCurrencyId);

  const numericAmount = Number(amount) || 0;
  const numericReceived = Number(received) || 0;
  const change = numericReceived > 0 ? numericReceived - numericAmount : 0;
  const baseEquivalent = currency ? numericAmount * (currency.exchangeRate || 1) : numericAmount;

  const pay = useMutation({
    mutationFn: () =>
      invoicesApi.addPayment(invoiceId, {
        amount: numericAmount,
        method,
        reference,
        currencyId: effectiveCurrencyId ?? 0,
      }),
    onSuccess: () => {
      toast.success(t("invoices.paymentRecorded"));
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setError(
        isApiError(mutationError) ? mutationError.message : (mutationError as Error).message,
      );
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (numericAmount <= 0) {
            setError(t("invoices.amount"));
            return;
          }
          if (baseEquivalent - remaining > 0.009) {
            setError(t("invoices.overpayment"));
            return;
          }
          if (!effectiveCurrencyId) {
            setError(t("common.currency"));
            return;
          }
          pay.mutate();
        }}
        className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("invoices.paymentTitle")}</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/25 bg-error-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2">
          <MoneyRow label={t("invoices.remaining")} value={formatMoney(remaining, locale)} strong />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMethod(item.value)}
              className={
                method === item.value
                  ? "h-10 rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
                  : "h-10 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted"
              }
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("invoices.amount")}</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 font-numeric text-sm tabular-nums outline-none focus:border-ring"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">{t("common.currency")}</span>
            <AppSelect
              value={effectiveCurrencyId ?? ""}
              onChange={(event) => setCurrencyId(Number(event.target.value))}
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            >
              {activeCurrencies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </AppSelect>
          </label>
          {method === "Cash" ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">{t("pos.amountReceived")}</span>
              <input
                value={received}
                onChange={(event) => setReceived(event.target.value)}
                inputMode="decimal"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 font-numeric text-sm tabular-nums outline-none focus:border-ring"
              />
            </label>
          ) : (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">{t("common.reference")}</span>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              />
            </label>
          )}
        </div>

        <div className="rounded-lg border border-border px-3 py-2">
          <MoneyRow
            label={t("invoices.baseEquivalent")}
            value={formatMoney(baseEquivalent, locale)}
          />
          {method === "Cash" && numericReceived > 0 && (
            <MoneyRow
              label={t("pos.change")}
              value={formatMoney(change, locale)}
              {...(change < 0 ? { tone: "destructive" as const } : { tone: "success" as const })}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={pay.isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pay.isPending && <Loader2 className="size-4 animate-spin" />}
          {t("invoices.recordPayment")}
        </button>
      </form>
    </div>
  );
}
