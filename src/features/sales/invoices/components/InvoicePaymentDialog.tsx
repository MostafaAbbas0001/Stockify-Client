import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/shared/components/AppSelect";
import { MoneyRow } from "@/shared/components/Surface";
import { PaymentMethodCode } from "@/features/lookups/codes";
import { useLookups } from "@/features/lookups/useLookups";
import { currenciesQuery } from "@/features/settings/currencies/queries";
import { useI18n } from "@/shared/i18n";
import { invoicesApi } from "@/features/sales/invoices/api";
import { isApiError } from "@/shared/api/errors";
import { formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field, FormError } from "@/shared/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";

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
  const lookups = useLookups();
  const methods = lookups.list("paymentMethods");

  const [methodId, setMethodId] = useState<number | null>(null);
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
  const method = methods.find((item) => item.id === methodId) ?? methods[0];
  const isCash = method?.code === PaymentMethodCode.Cash;

  const numericAmount = Number(amount) || 0;
  const numericReceived = Number(received) || 0;
  const change = numericReceived > 0 ? numericReceived - numericAmount : 0;
  const baseEquivalent = currency ? numericAmount * (currency.exchangeRate || 1) : numericAmount;

  const pay = useMutation({
    mutationFn: () =>
      invoicesApi.addPayment(invoiceId, {
        amount: numericAmount,
        paymentMethodId: method?.id ?? 0,
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

  return (
    <Dialog open={open} onOpenChange={(next) => !pay.isPending && onOpenChange(next)}>
      <DialogContent size="md">
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
          className="space-y-4"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t("invoices.paymentTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("invoices.paymentTitle")}</DialogDescription>
          </DialogHeader>

          <div>
            <p className="text-[13px] text-muted-foreground">{t("invoices.remaining")}</p>
            <p className="mt-0.5 truncate text-heading-sm font-semibold tabular-nums text-foreground sm:text-heading">
              {formatMoney(remaining, locale)}
            </p>
          </div>

          <FormError>{error}</FormError>

          <div
            role="radiogroup"
            aria-label={t("pos.paymentMethod")}
            className="grid grid-cols-3 gap-2"
          >
            {methods.map((item) => {
              const selected = method?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMethodId(item.id)}
                  className={cn(
                    "h-11 truncate rounded-control px-2 text-[13px] font-medium transition-colors sm:h-10",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-accent",
                  )}
                >
                  {lookups.label("paymentMethods", item)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("invoices.amount")}>
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="tabular-nums"
              />
            </Field>
            <Field label={t("common.currency")}>
              <AppSelect
                value={effectiveCurrencyId ?? ""}
                onChange={(event) => setCurrencyId(Number(event.target.value))}
                className="w-full"
              >
                {activeCurrencies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} – {item.name}
                  </option>
                ))}
              </AppSelect>
            </Field>
            {isCash ? (
              <Field label={t("pos.amountReceived")}>
                <Input
                  value={received}
                  onChange={(event) => setReceived(event.target.value)}
                  inputMode="decimal"
                  className="tabular-nums"
                />
              </Field>
            ) : (
              <Field label={t("common.reference")}>
                <Input value={reference} onChange={(event) => setReference(event.target.value)} />
              </Field>
            )}
          </div>

          <div className="border-t border-border pt-2">
            <MoneyRow
              label={t("invoices.baseEquivalent")}
              value={formatMoney(baseEquivalent, locale)}
            />
            {isCash && numericReceived > 0 && (
              <MoneyRow
                label={t("pos.change")}
                value={formatMoney(change, locale)}
                {...(change < 0 ? { tone: "destructive" as const } : {})}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={pay.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!method} loading={pay.isPending}>
              {t("invoices.recordPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
