import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
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

import { PosPaymentDialog } from "@/features/sales/pos/components/PosPaymentDialog";
import { usePosCart } from "@/features/sales/pos/hooks/usePosCart";
import { AppSelect } from "@/shared/components/AppSelect";
import { CustomerPickerDialog } from "@/features/people/customers/components/CustomerPickerDialog";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/DataStates";
import { SearchInput } from "@/shared/components/SearchInput";
import { Card, MoneyRow } from "@/shared/components/Surface";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PERM } from "@/features/auth/permissions";
import { categoriesQuery } from "@/features/catalog/categories/queries";
import { DiscountTypeCode } from "@/features/lookups/codes";
import { useLookups } from "@/features/lookups/useLookups";
import { branchEmployeesQuery } from "@/features/people/employees/queries";
import { deliveryChargesQuery } from "@/features/settings/delivery-locations/queries";
import { useI18n } from "@/shared/i18n";
import { isApiError } from "@/shared/api/errors";
import { variantsApi } from "@/features/catalog/products/api";
import { posApi } from "@/features/sales/pos/api";
import type { VariantRow } from "@/features/catalog/products/types";
import type { Customer } from "@/features/people/customers/types";
import type { PosItem } from "@/features/sales/pos/types";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { buttonVariants } from "@/shared/ui/variants";
import { Input } from "@/shared/ui/input";

type CreatedOrder = { orderId: number; invoiceId: number };

export function PosScreen() {
  const { t, locale } = useI18n();
  const lookups = useLookups();
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
      <div className="grid flex-1 place-items-center p-4 sm:p-6">
        <Card className="w-full max-w-md p-6 text-center sm:p-8">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <h2 className="mt-5 text-heading-sm font-semibold text-foreground">
            {t("pos.orderCreated")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("orders.orderNumber")} #{created.orderId}
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              to="/orders/$orderId"
              params={{ orderId: String(created.orderId) }}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("pos.viewOrder")}
            </Link>
            <Link
              to="/invoices/$invoiceId"
              params={{ invoiceId: String(created.invoiceId) }}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("pos.viewInvoice")}
            </Link>
          </div>
          <Button size="lg" onClick={resetSale} className="mt-2 w-full">
            <Plus className="size-4" />
            {t("pos.newSale")}
          </Button>
        </Card>
      </div>
    );
  }

  const chip = (active: boolean) =>
    cn(
      "h-9 shrink-0 rounded-control px-3.5 text-[13px] font-medium transition-colors",
      active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent",
    );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-28 sm:p-5 sm:pb-28 lg:min-h-0 lg:flex-row lg:p-6">
      {!online && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-destructive px-4 py-2 pt-[max(.5rem,env(safe-area-inset-top))] text-[13px] font-medium text-destructive-foreground"
        >
          <WifiOff className="size-4" />
          {t("pos.offlineBanner")}
        </div>
      )}

      {/* Scanning + catalog */}
      <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
        <Card className="p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const code = scanValue.trim();
              if (code) lookup.mutate(code);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative min-w-0 flex-1">
              <ScanBarcode className="pointer-events-none absolute inset-y-0 start-4 my-auto size-5 text-muted-foreground" />
              <Input
                ref={scanRef}
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                placeholder={t("pos.scanPlaceholder")}
                aria-label={t("pos.scanPlaceholder")}
                aria-invalid={scanError ? true : undefined}
                autoFocus
                autoComplete="off"
                className="h-12 ps-12 text-base sm:h-12"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              loading={lookup.isPending}
              disabled={scanValue.trim().length === 0}
            >
              {t("common.add")}
            </Button>
          </form>
          {scanError ? (
            <p className="mt-2 text-[13px] text-destructive" role="alert">
              {scanError}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">{t("pos.scanHint")}</p>
          )}
          <div className="mt-3 hidden flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground lg:flex">
            <Kbd>F2</Kbd> {t("pos.shortcutSearch")}
            <Kbd>F3</Kbd> {t("pos.shortcutCustomer")}
            <Kbd>F4</Kbd> {t("pos.shortcutPay")}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="ms-auto font-medium text-primary-strong underline-offset-4 hover:underline"
            >
              {t("pos.shortcutTitle")}
            </button>
          </div>
        </Card>

        <Card className="flex flex-1 flex-col lg:min-h-0">
          <div className="space-y-3 border-b border-border p-4">
            <SearchInput
              value={catalogSearch}
              onChange={setCatalogSearch}
              placeholder={t("pos.catalogSearch")}
            />
            <div
              className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4"
              role="group"
              aria-label={t("products.category")}
            >
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                aria-pressed={categoryId === null}
                className={chip(categoryId === null)}
              >
                {t("common.all")}
              </button>
              {(categories.data ?? []).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  aria-pressed={categoryId === category.id}
                  className={chip(categoryId === category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 p-4 lg:min-h-0 lg:overflow-y-auto">
            {catalog.isPending ? (
              <LoadingState />
            ) : catalog.isError ? (
              <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
            ) : catalog.data.items.length === 0 ? (
              <EmptyState filtered={catalogSearch.length > 0} />
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                        "flex min-w-0 flex-col gap-2 rounded-control border border-border bg-card p-2 text-start transition-colors sm:p-2.5",
                        out
                          ? "cursor-not-allowed opacity-50"
                          : "hover:border-border-strong active:bg-muted",
                      )}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
                        {variant.imageUrl || variant.productImageUrl ? (
                          <img
                            src={variant.imageUrl ?? variant.productImageUrl ?? ""}
                            alt={variant.productName}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="grid size-full place-items-center text-muted-foreground">
                            <Package className="size-6" aria-hidden />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 px-0.5">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {variant.productName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {variant.sku}
                        </p>
                      </div>
                      <div className="mt-auto flex items-end justify-between gap-2 px-0.5">
                        <span className="text-[15px] font-semibold tabular-nums tracking-tight text-foreground">
                          {formatMoney(variant.netPrice ?? variant.price, locale)}
                        </span>
                        <span
                          className={cn(
                            "truncate text-xs tabular-nums",
                            out
                              ? "text-destructive"
                              : low
                                ? "font-medium text-foreground"
                                : "text-muted-foreground",
                          )}
                        >
                          {out ? t("pos.outOfStock") : variant.stockQuantity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Mobile cart backdrop */}
      <button
        type="button"
        aria-label={t("common.close")}
        tabIndex={mobileCartOpen ? 0 : -1}
        onClick={() => setMobileCartOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden",
          mobileCartOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Cart: a bottom sheet on phones and tablets, a docked card from lg up. */}
      <aside
        aria-label={t("pos.cart")}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] min-h-0 flex-col overflow-hidden rounded-t-surface border border-b-0 border-border bg-card shadow-float transition-transform duration-200 ease-out",
          "lg:static lg:z-auto lg:max-h-none lg:w-[24rem] lg:translate-y-0 lg:rounded-surface lg:border-b lg:shadow-card xl:w-[26rem]",
          mobileCartOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <span aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-border lg:hidden" />
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border ps-4 pe-2">
          <h2 className="flex items-center gap-2 text-body-lg font-semibold text-foreground">
            {t("pos.cart")}
            {totals.itemCount > 0 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-control bg-primary px-1.5 text-xs font-semibold tabular-nums text-primary-foreground">
                {totals.itemCount}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            {cart.lines.length > 0 && (
              <Button
                variant="quiet-destructive"
                size="sm"
                onClick={() => setResetConfirmOpen(true)}
              >
                {t("common.clear")}
              </Button>
            )}
            <Button
              variant="quiet"
              size="icon"
              onClick={() => setMobileCartOpen(false)}
              aria-label={t("common.close")}
              className="lg:hidden"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        <div className="min-h-[7rem] flex-1 overflow-y-auto overscroll-contain">
          {cart.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <ShoppingCart className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-foreground">{t("pos.emptyCart")}</p>
              <p className="text-[13px] text-muted-foreground">{t("pos.emptyCartHint")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {line.productName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[line.sku, ...line.attributes].join(" / ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(line.unitTotal * line.quantity, locale)}
                      </p>
                      {line.unitSaleDiscount > 0 && (
                        <p className="text-xs tabular-nums text-muted-foreground">
                          −{formatMoney(line.unitSaleDiscount * line.quantity, locale)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1">
                    <div className="flex items-center rounded-control bg-muted p-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)}
                        aria-label={t("common.remove")}
                        className="hover:bg-card"
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={line.stockQuantity}
                        value={line.quantity}
                        onChange={(event) =>
                          cart.setQuantity(line.variantId, Number(event.target.value))
                        }
                        aria-label={t("common.quantity")}
                        className="h-9 w-12 bg-transparent text-center text-base font-medium tabular-nums text-foreground outline-none sm:h-8 sm:text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={line.quantity >= line.stockQuantity}
                        onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
                        aria-label={t("common.add")}
                        className="hover:bg-card"
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    {line.quantity >= line.stockQuantity && (
                      <p className="ms-2 text-xs text-muted-foreground">
                        {t("pos.stockLimit", { count: line.stockQuantity })}
                      </p>
                    )}
                    <Button
                      variant="quiet-destructive"
                      size="icon-sm"
                      onClick={() => cart.removeLine(line.variantId)}
                      aria-label={t("common.delete")}
                      className="ms-auto"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => setCustomerPickerOpen(true)}
              className="col-span-2 justify-start"
            >
              <UserPlus className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{customer ? customer.name : t("pos.selectCustomer")}</span>
            </Button>

            <AppSelect
              value={salespersonId ?? ""}
              onChange={(event) =>
                setSalespersonId(event.target.value ? Number(event.target.value) : null)
              }
              aria-label={t("pos.selectSalesperson")}
              className="w-full min-w-0"
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
              aria-label={t("pos.deliveryLocation")}
              className="w-full min-w-0"
            >
              <option value="">{t("pos.deliveryLocation")}</option>
              {(deliveryCharges.data ?? []).map((charge) => (
                <option key={charge.id} value={charge.id}>
                  {charge.locationName} ({formatMoney(charge.fee, locale)})
                </option>
              ))}
            </AppSelect>

            <div className="col-span-2 flex items-center gap-2">
              <span className="shrink-0 text-[13px] text-muted-foreground">
                {t("pos.orderDiscount")}
              </span>
              <AppSelect
                value={cart.discountTypeCode}
                onChange={(event) => {
                  const next = event.target.value;
                  cart.setDiscountTypeCode(next);
                  if (next === DiscountTypeCode.None) cart.setDiscountValue(0);
                }}
                aria-label={t("pos.discountValue")}
                className="min-w-0 flex-1"
              >
                {lookups.list("discountTypes").map((type) => (
                  <option key={type.id} value={type.code}>
                    {lookups.label("discountTypes", type)}
                  </option>
                ))}
              </AppSelect>
              {cart.discountTypeCode !== DiscountTypeCode.None && (
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={cart.discountValue}
                  onChange={(event) => cart.setDiscountValue(Number(event.target.value))}
                  aria-label={t("pos.discountValue")}
                  className="w-24 text-center tabular-nums"
                />
              )}
            </div>
          </div>

          <div>
            <MoneyRow
              label={t("common.subtotal")}
              value={formatMoney(totals.grossSubtotal, locale)}
            />
            {totals.saleDiscount > 0 && (
              <MoneyRow
                label={t("pos.saleDiscount")}
                value={`−${formatMoney(totals.saleDiscount, locale)}`}
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
              />
            )}
            <div className="mt-2 border-t border-border pt-3">
              <p className="text-[13px] text-muted-foreground">{t("common.total")}</p>
              <p className="mt-0.5 truncate text-heading-lg font-semibold tabular-nums tracking-[-0.05em] text-foreground sm:text-display">
                {formatMoney(totals.total, locale)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("pos.taxNote")}</p>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handlePay}
            disabled={cart.lines.length === 0 || !can(PERM.orderCreate) || !online}
            className="w-full"
          >
            {t("pos.pay")}
            <kbd className="ms-1 hidden rounded-sm bg-primary-foreground/15 px-1.5 py-0.5 text-xs font-medium lg:inline">
              F4
            </kbd>
          </Button>
        </div>
      </aside>

      {!mobileCartOpen && (
        <div className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 lg:hidden">
          <Button
            size="lg"
            onClick={() => setMobileCartOpen(true)}
            className="h-14 w-full justify-between px-5 shadow-float"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              {t("pos.cart")}
              <span className="grid h-6 min-w-6 place-items-center rounded-control bg-primary-foreground/15 px-1.5 text-xs tabular-nums">
                {totals.itemCount}
              </span>
            </span>
            <span className="text-base font-semibold tabular-nums">
              {formatMoney(totals.total, locale)}
            </span>
          </Button>
        </div>
      )}

      {/* Partial SKU match: confirm before adding. */}
      <Dialog open={Boolean(ambiguous)} onOpenChange={(open) => !open && setAmbiguous(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("pos.ambiguousTitle")}</DialogTitle>
            <DialogDescription>{t("pos.ambiguousBody")}</DialogDescription>
          </DialogHeader>
          {ambiguous && (
            <div className="rounded-control bg-muted px-4 py-3">
              <p className="text-sm font-medium text-foreground">{ambiguous.item.productName}</p>
              <p className="text-xs text-muted-foreground">{ambiguous.item.sku}</p>
              <div className="mt-2 flex items-center justify-between text-sm tabular-nums">
                <span className="font-semibold text-foreground">
                  {formatMoney(ambiguous.item.totalAmount, locale)}
                </span>
                <span className="text-muted-foreground">
                  {t("pos.stock")}: {ambiguous.item.stockQuantity}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAmbiguous(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (ambiguous) addItem(ambiguous.item);
                setAmbiguous(null);
                scanRef.current?.focus();
              }}
            >
              {t("pos.addAnyway")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            discountTypeId: lookups.byCode("discountTypes", cart.discountTypeCode)?.id ?? null,
            discountValue: cart.discountTypeCode === DiscountTypeCode.None ? 0 : cart.discountValue,
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
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{t("pos.shortcutTitle")}</DialogTitle>
            <DialogDescription>{t("pos.shortcutDescription")}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">
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

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-7 justify-center rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </kbd>
  );
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <>
      <dt>
        <Kbd>{keys}</Kbd>
      </dt>
      <dd className="text-muted-foreground">{label}</dd>
    </>
  );
}
