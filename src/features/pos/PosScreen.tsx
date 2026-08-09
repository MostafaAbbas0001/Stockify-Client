import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  ScanBarcode,
  ShoppingCart,
  Trash2,
  UserPlus,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PosPaymentDialog } from "./PosPaymentDialog";
import { usePosCart } from "./usePosCart";
import { AppSelect } from "@/components/common/AppSelect";
import { CustomerPickerDialog } from "@/features/customers/CustomerPickerDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/DataStates";
import { SearchInput } from "@/components/common/SearchInput";
import { MoneyRow } from "@/components/common/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import {
  branchEmployeesQuery,
  categoriesQuery,
  deliveryChargesQuery,
} from "@/features/reference/queries";
import { useI18n } from "@/i18n";
import { isApiError } from "@/lib/api/errors";
import { posApi, variantsApi } from "@/lib/api/endpoints";
import type { Customer, PosItem, VariantRow } from "@/lib/api/types";
import { DiscountType } from "@/lib/enums";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CreatedOrder = { orderId: number; invoiceId: number };

export function PosScreen() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const cart = usePosCart();
  const scanRef = useRef<HTMLInputElement>(null);

  const [scanValue, setScanValue] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [salespersonId, setSalespersonId] = useState<number | null>(null);
  const [deliveryLocationId, setDeliveryLocationId] = useState<number | null>(null);
  const [ambiguous, setAmbiguous] = useState<{ item: PosItem; code: string } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const employees = useQuery(branchEmployeesQuery());
  const deliveryCharges = useQuery(deliveryChargesQuery());
  const categories = useQuery(categoriesQuery());

  const catalog = useQuery({
    queryKey: ["pos", "catalog", catalogSearch, categoryId],
    queryFn: () =>
      variantsApi.list({
        search: catalogSearch || undefined,
        categoryId: categoryId ?? undefined,
        isSellable: true,
        page: 1,
      }),
    staleTime: 30_000,
  });

  const salespeople = (employees.data ?? []).filter((employee) => employee.isSale);

  useEffect(() => {
    if (salespersonId === null && salespeople.length === 1 && salespeople[0]) {
      setSalespersonId(salespeople[0].id);
    }
  }, [salespeople, salespersonId]);

  const deliveryFee =
    deliveryCharges.data?.find((charge) => charge.id === deliveryLocationId)?.fee ?? 0;
  const totals = cart.totalsFor(deliveryFee);

  const addItem = useCallback(
    (item: PosItem) => {
      if (!item.isSellable) {
        toast.error(t("pos.notSellable"));
        return;
      }
      if (item.stockQuantity <= 0) {
        toast.error(t("pos.outOfStock"));
        return;
      }
      cart.addLine(item);
    },
    [cart, t],
  );

  const lookup = useMutation({
    mutationFn: (code: string) => posApi.lookup(code),
    onSuccess: (item, code) => {
      setScanError(null);
      const trimmed = code.trim().toLowerCase();
      const exact =
        item.sku.toLowerCase() === trimmed || (item.barcode ?? "").toLowerCase() === trimmed;
      // Partial SKU searches return the first match, so confirm before adding.
      if (exact) addItem(item);
      else setAmbiguous({ item, code });
      setScanValue("");
    },
    onError: (error) => {
      setScanError(
        isApiError(error) && error.isNotFound ? t("pos.itemNotFound") : (error as Error).message,
      );
    },
  });

  const addVariant = useMutation({
    mutationFn: (variant: VariantRow) => posApi.lookup(variant.barcode ?? variant.sku),
    onSuccess: (item) => addItem(item),
    onError: (error) => {
      toast.error(
        isApiError(error) && error.isNotFound ? t("pos.itemNotFound") : (error as Error).message,
      );
    },
  });

  const resetSale = () => {
    cart.reset();
    setCustomer(null);
    setDeliveryLocationId(null);
    setCreated(null);
    setScanError(null);
    setMobileCartOpen(false);
    scanRef.current?.focus();
  };

  const validationMessage = (): string | null => {
    if (cart.lines.length === 0) return t("pos.emptyCart");
    if (!customer) return t("pos.requiresCustomer");
    if (salespersonId === null) return t("pos.requiresSalesperson");
    if (deliveryLocationId === null) return t("pos.requiresDelivery");
    return null;
  };

  const handlePay = () => {
    if (!online) {
      toast.error(t("pos.offlineBlocked"));
      return;
    }
    const message = validationMessage();
    if (message) {
      toast.error(message);
      return;
    }
    setPaymentOpen(true);
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // POS keyboard workflow, including a discoverable F1 reference.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        setHelpOpen((open) => !open);
      } else if (event.key === "F2") {
        event.preventDefault();
        scanRef.current?.focus();
      } else if (event.key === "F3") {
        event.preventDefault();
        setCustomerPickerOpen(true);
      } else if (event.key === "F4") {
        event.preventDefault();
        handlePay();
      } else if (event.key === "F8") {
        event.preventDefault();
        if (cart.lines.length > 0) setResetConfirmOpen(true);
      } else if (event.key === "Escape") {
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (created) {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto size-8 text-success" />
          <h2 className="mt-4 text-base font-semibold text-foreground">{t("pos.orderCreated")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("orders.orderNumber")} #{created.orderId}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              to="/orders/$orderId"
              params={{ orderId: String(created.orderId) }}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("pos.viewOrder")}
            </Link>
            <Link
              to="/invoices/$invoiceId"
              params={{ invoiceId: String(created.invoiceId) }}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("pos.viewInvoice")}
            </Link>
          </div>
          <button
            type="button"
            onClick={resetSale}
            className="mt-3 h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("pos.title")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 pb-24 sm:p-4 sm:pb-24 lg:flex-row lg:p-6">
      {!online && (
        <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground">
          <WifiOff className="size-4" />
          {t("pos.offlineBanner")}
        </div>
      )}
      {/* Scanning + catalog */}
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const code = scanValue.trim();
              if (code) lookup.mutate(code);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <ScanBarcode className="pointer-events-none absolute inset-y-0 start-3 my-auto size-5 text-primary" />
              <input
                ref={scanRef}
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                placeholder={t("pos.scanPlaceholder")}
                autoFocus
                autoComplete="off"
                className="h-12 w-full rounded-xl border border-input bg-background ps-11 pe-3 font-numeric text-base shadow-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/15"
              />
            </div>
            <button
              type="submit"
              disabled={lookup.isPending || scanValue.trim().length === 0}
              className="grid h-12 min-w-12 place-items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {lookup.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.add")}
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{t("pos.scanHint")}</p>
          {scanError && <p className="mt-1 text-xs text-destructive">{scanError}</p>}
          <p className="mt-2 hidden text-[0.68rem] text-muted-foreground/80 sm:block">
            {t("pos.shortcuts")}: F2 {t("pos.shortcutSearch")} · F3 {t("pos.shortcutCustomer")} · F4{" "}
            {t("pos.shortcutPay")}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
            <SearchInput
              value={catalogSearch}
              onChange={setCatalogSearch}
              placeholder={t("pos.catalogSearch")}
            />
            <div
              className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5"
              aria-label={t("products.category")}
            >
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors",
                  categoryId === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t("common.all")}
              </button>
              {(categories.data ?? []).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={cn(
                    "h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors",
                    categoryId === category.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {catalog.isPending ? (
              <LoadingState />
            ) : catalog.isError ? (
              <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
            ) : catalog.data.items.length === 0 ? (
              <EmptyState filtered={catalogSearch.length > 0} />
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 2xl:grid-cols-5">
                {catalog.data.items.map((variant) => {
                  const out = variant.stockQuantity <= 0;
                  const low = !out && (variant.lowStockBranches?.length ?? 0) > 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={out || addVariant.isPending}
                      onClick={() => addVariant.mutate(variant)}
                      className={cn(
                        "group flex min-h-48 flex-col gap-2 overflow-hidden rounded-xl border border-border/80 bg-surface p-2.5 text-start shadow-sm transition-[border-color,box-shadow,transform] sm:min-h-56 sm:p-3",
                        out
                          ? "opacity-55"
                          : "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md active:translate-y-0",
                      )}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-sunken">
                        {variant.imageUrl || variant.productImageUrl ? (
                          <img
                            src={variant.imageUrl ?? variant.productImageUrl ?? ""}
                            alt={variant.productName}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="grid size-full place-items-center text-muted-foreground">
                            <Package className="size-6" />
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {variant.productName}
                      </p>
                      <p className="font-mono text-[0.65rem] text-muted-foreground">
                        {variant.sku}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-1">
                        <span className="font-numeric text-base font-bold tracking-tight text-foreground">
                          {formatMoney(variant.netPrice ?? variant.price, locale)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[0.65rem] font-semibold",
                            out ? "text-destructive" : low ? "text-warning" : "text-success",
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {out
                            ? t("pos.outOfStock")
                            : `${t(low ? "pos.lowStock" : "pos.inStock")}: ${variant.stockQuantity}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mobile cart backdrop */}
      {mobileCartOpen && (
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={() => setMobileCartOpen(false)}
          className="fixed inset-0 top-16 z-40 bg-foreground/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Cart */}
      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 z-50 flex min-h-0 flex-col overflow-hidden rounded-t-2xl border border-border/80 bg-card shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:w-[26rem] lg:translate-y-0 lg:rounded-2xl lg:shadow-sm xl:w-[28rem]",
          mobileCartOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex min-h-14 items-center justify-between border-b border-border/70 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShoppingCart className="size-4" />
            {t("pos.cart")}
            {totals.itemCount > 0 && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.68rem] font-semibold text-primary">
                {totals.itemCount}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            {cart.lines.length > 0 && (
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="h-9 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-error-soft hover:text-destructive"
              >
                {t("common.clear")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileCartOpen(false)}
              className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              aria-label={t("common.close")}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-[8rem] flex-1 overflow-y-auto">
          {cart.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <ShoppingCart className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t("pos.emptyCart")}</p>
              <p className="text-xs text-muted-foreground">{t("pos.emptyCartHint")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="flex gap-3 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {line.productName}
                    </p>
                    <p className="truncate font-mono text-[0.65rem] text-muted-foreground">
                      {line.sku}
                      {line.attributes.length > 0 ? ` · ${line.attributes.join(" / ")}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)}
                        className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={t("common.remove")}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={line.stockQuantity}
                        value={line.quantity}
                        onChange={(event) =>
                          cart.setQuantity(line.variantId, Number(event.target.value))
                        }
                        className="h-10 w-14 rounded-xl border border-input bg-background text-center font-numeric text-sm font-semibold outline-none focus:border-ring"
                      />
                      <button
                        type="button"
                        disabled={line.quantity >= line.stockQuantity}
                        onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
                        className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                        aria-label={t("common.add")}
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => cart.removeLine(line.variantId)}
                        className="ms-1 grid size-10 place-items-center text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {line.quantity >= line.stockQuantity && (
                      <p className="mt-1 text-[0.65rem] text-warning">
                        {t("pos.stockLimit", { count: line.stockQuantity })}
                      </p>
                    )}
                  </div>
                  <div className="text-end">
                    <p className="font-numeric text-sm font-semibold text-foreground">
                      {formatMoney(line.unitTotal * line.quantity, locale)}
                    </p>
                    {line.unitSaleDiscount > 0 && (
                      <p className="font-numeric text-[0.65rem] text-success">
                        −{formatMoney(line.unitSaleDiscount * line.quantity, locale)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-border/70 bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCustomerPickerOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-start text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <UserPlus className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{customer ? customer.name : t("pos.selectCustomer")}</span>
            </button>

            <AppSelect
              value={salespersonId ?? ""}
              onChange={(event) =>
                setSalespersonId(event.target.value ? Number(event.target.value) : null)
              }
              className="h-10 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="">
                {salespeople.length === 0 ? t("pos.noSalespeople") : t("pos.selectSalesperson")}
              </option>
              {salespeople.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </AppSelect>

            <AppSelect
              value={deliveryLocationId ?? ""}
              onChange={(event) =>
                setDeliveryLocationId(event.target.value ? Number(event.target.value) : null)
              }
              className="h-10 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="">{t("pos.deliveryLocation")}</option>
              {(deliveryCharges.data ?? []).map((charge) => (
                <option key={charge.id} value={charge.id}>
                  {charge.locationName} · {formatMoney(charge.fee, locale)}
                </option>
              ))}
            </AppSelect>

            <div className="flex gap-1.5">
              <AppSelect
                value={cart.discountType}
                onChange={(event) => {
                  const next = Number(event.target.value) as 0 | 1 | 2;
                  cart.setDiscountType(next);
                  if (next === DiscountType.None) cart.setDiscountValue(0);
                }}
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring"
              >
                <option value={DiscountType.None}>{t("pos.discountNone")}</option>
                <option value={DiscountType.Percent}>{t("pos.discountPercent")}</option>
                <option value={DiscountType.Amount}>{t("pos.discountAmount")}</option>
              </AppSelect>
              {cart.discountType !== DiscountType.None && (
                <input
                  type="number"
                  min={0}
                  value={cart.discountValue}
                  onChange={(event) => cart.setDiscountValue(Number(event.target.value))}
                  aria-label={t("pos.discountValue")}
                  className="h-10 w-20 rounded-lg border border-input bg-background px-2 text-center font-numeric text-xs outline-none focus:border-ring"
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface-sunken px-3.5 py-2.5">
            <MoneyRow
              label={t("common.subtotal")}
              value={formatMoney(totals.grossSubtotal, locale)}
            />
            {totals.saleDiscount > 0 && (
              <MoneyRow
                label={t("pos.saleDiscount")}
                value={`−${formatMoney(totals.saleDiscount, locale)}`}
                tone="success"
              />
            )}
            <MoneyRow label={t("common.tax")} value={formatMoney(totals.tax, locale)} />
            {totals.deliveryFee > 0 && (
              <MoneyRow
                label={t("common.delivery")}
                value={formatMoney(totals.deliveryFee, locale)}
              />
            )}
            {totals.orderDiscount > 0 && (
              <MoneyRow
                label={t("pos.orderDiscount")}
                value={`−${formatMoney(totals.orderDiscount, locale)}`}
                tone="success"
              />
            )}
            <div className="mt-1 border-t border-border pt-1">
              <MoneyRow
                label={t("common.total")}
                value={formatMoney(totals.total, locale)}
                strong
              />
            </div>
            <p className="mt-1 text-[0.65rem] text-muted-foreground">{t("pos.taxNote")}</p>
          </div>

          <button
            type="button"
            onClick={handlePay}
            disabled={cart.lines.length === 0 || !can(PERM.orderCreate) || !online}
            className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {t("pos.pay")} · {formatMoney(totals.total, locale)}
          </button>
        </div>
      </aside>

      {!mobileCartOpen && (
        <div className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-4 text-primary-foreground shadow-xl shadow-black/15"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShoppingCart className="size-5" />
              {t("pos.cart")}
              <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs">
                {totals.itemCount}
              </span>
            </span>
            <span className="font-numeric text-base font-bold">
              {formatMoney(totals.total, locale)}
            </span>
          </button>
        </div>
      )}

      {/* Ambiguous scan confirmation */}
      {ambiguous && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-foreground">{t("pos.ambiguousTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("pos.ambiguousBody")}</p>
            <div className="mt-4 rounded-lg border border-border bg-surface p-3">
              <p className="text-sm font-medium text-foreground">{ambiguous.item.productName}</p>
              <p className="font-mono text-xs text-muted-foreground">{ambiguous.item.sku}</p>
              <p className="mt-1 font-numeric text-sm text-foreground">
                {formatMoney(ambiguous.item.totalAmount, locale)} · {t("pos.stock")}:{" "}
                {ambiguous.item.stockQuantity}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAmbiguous(null)}
                className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  addItem(ambiguous.item);
                  setAmbiguous(null);
                  scanRef.current?.focus();
                }}
                className="h-10 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t("pos.addAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomerPickerDialog
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onSelect={(selected) => {
          setCustomer(selected);
          setCustomerPickerOpen(false);
        }}
      />

      {paymentOpen && customer && salespersonId !== null && deliveryLocationId !== null && (
        <PosPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          totals={totals}
          orderPayload={{
            customerId: customer.id,
            deliveryLocationId,
            createdByEmployeeId: salespersonId,
            discountType: cart.discountType,
            discountValue: cart.discountType === DiscountType.None ? 0 : cart.discountValue,
            items: cart.itemsPayload,
          }}
          onCompleted={(result) => {
            setPaymentOpen(false);
            setCreated(result);
            void queryClient.invalidateQueries({ queryKey: ["orders"] });
            void queryClient.invalidateQueries({ queryKey: ["invoices"] });
            void queryClient.invalidateQueries({ queryKey: ["pos", "catalog"] });
          }}
        />
      )}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pos.shortcutTitle")}</DialogTitle>
            <DialogDescription>{t("pos.shortcutDescription")}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Shortcut keys="F1" label={t("pos.shortcutToggleHelp")} />
            <Shortcut keys="F2" label={t("pos.shortcutSearch")} />
            <Shortcut keys="F3" label={t("pos.shortcutCustomer")} />
            <Shortcut keys="F4" label={t("pos.shortcutPay")} />
            <Shortcut keys="F8" label={t("pos.shortcutNewSale")} />
            <Shortcut keys="Esc" label={t("pos.shortcutClose")} />
          </dl>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={resetConfirmOpen}
        title={t("pos.resetTitle")}
        body={t("pos.resetBody")}
        confirmLabel={t("pos.resetSale")}
        tone="destructive"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setResetConfirmOpen(false);
          resetSale();
        }}
      />
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <>
      <dt>
        <kbd className="inline-flex min-w-10 justify-center rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs font-semibold">
          {keys}
        </kbd>
      </dt>
      <dd className="self-center text-muted-foreground">{label}</dd>
    </>
  );
}
