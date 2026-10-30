import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, Landmark, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { CartTotals } from "@/features/sales/pos/hooks/usePosCart";
import { AppSelect } from "@/shared/components/AppSelect";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { useLookups } from "@/features/lookups/useLookups";
import { currenciesQuery } from "@/features/settings/currencies/queries";
import { useI18n } from "@/shared/i18n";
import { invoicesApi } from "@/features/sales/invoices/api";
import { ordersApi } from "@/features/sales/orders/api";
import { isApiError } from "@/shared/api/errors";
import type { CreateOrderRequest } from "@/features/sales/orders/types";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { CheckboxField, Field, FormError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

/** Icons by payment method code; methods added later in the database get the generic icon. */
const METHOD_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  CARD: CreditCard,
  BANK_TRANSFER: Landmark,
};

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
  const lookups = useLookups();
  const methods = lookups.list("paymentMethods");

  const [methodId, setMethodId] = useState<number | null>(null);
  const method = methods.find((item) => item.id === methodId) ?? methods[0];
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
      if (recordPayment && method && effectiveCurrencyId !== null && receivedNumber > 0) {
        const amount = Math.min(receivedNumber, totals.total);
        try {
          await invoicesApi.addPayment(order.invoiceId, {
            amount,
            paymentMethodId: method.id,
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

  const close = (next: boolean) => {
    if (!next && !submit.isPending) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t("pos.paymentTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("pos.paymentTitle")}</DialogDescription>
        </DialogHeader>

        <div>
          <p className="text-[13px] text-muted-foreground">{t("common.total")}</p>
          <p className="mt-0.5 truncate text-heading-lg font-semibold tabular-nums tracking-[-0.05em] text-foreground sm:text-display">
            {formatMoney(totals.total, locale, currency?.symbol)}
          </p>
        </div>

        <FormError>{error}</FormError>

        <div className="space-y-4">
          <div
            role="radiogroup"
            aria-label={t("pos.paymentMethod")}
            className="grid grid-cols-3 gap-2"
          >
            {methods.map((option) => {
              const Icon = METHOD_ICONS[option.code] ?? Wallet;
              const selected = method?.id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMethodId(option.id)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1.5 rounded-control px-2 text-[13px] font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="truncate">{lookups.label("paymentMethods", option)}</span>
                </button>
              );
            })}
          </div>

          {activeCurrencies.length > 1 && (
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
          )}

          {can(PERM.invoicePaymentAdd) && (
            <CheckboxField
              checked={recordPayment}
              onChange={setRecordPayment}
              label={t("pos.recordPaymentNow")}
              description={t("pos.recordPaymentNowHint")}
            />
          )}

          {recordPayment && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("pos.amountReceived")}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={received}
                    onChange={(event) => setReceived(event.target.value)}
                    className="tabular-nums"
                  />
                </Field>
                <Field label={t("common.reference")}>
                  <Input value={reference} onChange={(event) => setReference(event.target.value)} />
                </Field>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">{t("pos.change")}</span>
                <span
                  className={cn(
                    "text-subheading font-semibold tabular-nums",
                    change < 0 ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {formatMoney(Math.max(0, change), locale, currency?.symbol)}
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => close(false)}
            disabled={submit.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="lg"
            loading={submit.isPending}
            onClick={() => {
              setError(null);
              submit.mutate();
            }}
          >
            {submit.isPending ? t("pos.creatingOrder") : t("pos.completePayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
