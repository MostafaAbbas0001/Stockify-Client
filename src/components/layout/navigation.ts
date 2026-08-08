import {
  Boxes,
  Building2,
  ClipboardList,
  Contact,
  FileText,
  Gauge,
  LayoutGrid,
  Layers,
  PackageSearch,
  Percent,
  Receipt,
  ScanBarcode,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  ArrowLeftRight,
  History,
  type LucideIcon,
} from "lucide-react";

import { TAB } from "@/features/auth/permissions";

export type NavItem = {
  /** Translation key under `nav.` */
  labelKey: string;
  to: string;
  icon: LucideIcon;
  tab: string;
  /** Screens delivered in later phases still appear, marked as coming soon. */
  comingSoon?: boolean;
};

export type NavSection = {
  labelKey: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "nav.workspace",
    items: [
      { labelKey: "nav.pos", to: "/pos", icon: ScanBarcode, tab: TAB.pos },
      { labelKey: "nav.orders", to: "/orders", icon: ClipboardList, tab: TAB.orders },
      { labelKey: "nav.invoices", to: "/invoices", icon: Receipt, tab: TAB.invoices },
      { labelKey: "nav.dashboard", to: "/dashboard", icon: Gauge, tab: TAB.dashboard },
    ],
  },
  {
    labelKey: "nav.people",
    items: [
      { labelKey: "nav.customers", to: "/customers", icon: Contact, tab: TAB.customers },
      { labelKey: "nav.employees", to: "/employees", icon: Users, tab: TAB.employees },
    ],
  },
  {
    labelKey: "nav.catalog",
    items: [
      { labelKey: "nav.products", to: "/products", icon: PackageSearch, tab: TAB.products },
      { labelKey: "nav.categories", to: "/categories", icon: LayoutGrid, tab: TAB.categories },
      { labelKey: "nav.brands", to: "/brands", icon: Layers, tab: TAB.brands },
      { labelKey: "nav.attributes", to: "/attributes", icon: Settings2, tab: TAB.attributes },
      { labelKey: "nav.sales", to: "/sales", icon: Percent, tab: TAB.sales },
    ],
  },
  {
    labelKey: "nav.inventory",
    items: [
      { labelKey: "nav.stock", to: "/stock", icon: Boxes, tab: TAB.stock },
      { labelKey: "nav.transfers", to: "/transfers", icon: ArrowLeftRight, tab: TAB.stockTransfer },
      { labelKey: "nav.movements", to: "/movements", icon: History, tab: TAB.stockMovement },
    ],
  },
  {
    labelKey: "nav.finance",
    items: [
      { labelKey: "nav.expenses", to: "/expenses", icon: Wallet, tab: TAB.expenses },
      { labelKey: "nav.deliveryCharges", to: "/delivery-charges", icon: Truck, tab: TAB.delivery },
      { labelKey: "nav.reports", to: "/reports", icon: FileText, tab: TAB.reports },
    ],
  },
  {
    labelKey: "nav.administration",
    items: [
      { labelKey: "nav.branches", to: "/branches", icon: Building2, tab: TAB.branches },
      { labelKey: "nav.users", to: "/users", icon: ShieldCheck, tab: TAB.users },
    ],
  },
];

/** First landing screen for a user, based on their tab permissions. */
export function firstPermittedRoute(can: (key: string) => boolean): string {
  if (can(TAB.dashboard)) return "/dashboard";
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (!item.comingSoon && can(item.tab)) return item.to;
    }
  }
  return "/no-access";
}
