import { queryOptions } from "@tanstack/react-query";

import {
  attributesApi,
  brandsApi,
  categoriesApi,
  employeesApi,
  referenceApi,
  stockMovementsApi,
} from "@/lib/api/endpoints";

export const referenceKeys = {
  branches: ["reference", "branches"] as const,
  currencies: ["reference", "currencies"] as const,
  taxRates: ["reference", "tax-rates"] as const,
  deliveryCharges: ["reference", "delivery-charges"] as const,
  orderStatuses: ["reference", "order-statuses"] as const,
  invoiceStatuses: ["reference", "invoice-statuses"] as const,
  branchEmployees: ["reference", "branch-employees"] as const,
  brands: ["reference", "brands"] as const,
  categories: ["reference", "categories"] as const,
  attributes: ["reference", "attributes"] as const,
  roles: ["reference", "roles"] as const,
};

const STATIC = { staleTime: 5 * 60_000 };

export const branchesQuery = () =>
  queryOptions({ queryKey: referenceKeys.branches, queryFn: referenceApi.branches, ...STATIC });

export const currenciesQuery = () =>
  queryOptions({ queryKey: referenceKeys.currencies, queryFn: referenceApi.currencies, ...STATIC });

export const deliveryChargesQuery = () =>
  queryOptions({
    queryKey: referenceKeys.deliveryCharges,
    queryFn: referenceApi.deliveryCharges,
    ...STATIC,
  });

export const orderStatusesQuery = () =>
  queryOptions({
    queryKey: referenceKeys.orderStatuses,
    queryFn: referenceApi.orderStatuses,
    ...STATIC,
  });

export const invoiceStatusesQuery = () =>
  queryOptions({
    queryKey: referenceKeys.invoiceStatuses,
    queryFn: referenceApi.invoiceStatuses,
    ...STATIC,
  });

/** Sales staff for the signed-in user's branch (from the JWT branch claim). */
export const branchEmployeesQuery = () =>
  queryOptions({
    queryKey: referenceKeys.branchEmployees,
    queryFn: employeesApi.currentBranch,
    staleTime: 60_000,
  });

export const brandsQuery = () =>
  queryOptions({ queryKey: referenceKeys.brands, queryFn: brandsApi.list, ...STATIC });

export const categoriesQuery = () =>
  queryOptions({ queryKey: referenceKeys.categories, queryFn: categoriesApi.list, ...STATIC });

export const attributesQuery = () =>
  queryOptions({ queryKey: referenceKeys.attributes, queryFn: attributesApi.list, ...STATIC });

export const rolesQuery = () =>
  queryOptions({ queryKey: referenceKeys.roles, queryFn: referenceApi.roles, ...STATIC });

export const movementTypesQuery = () =>
  queryOptions({
    queryKey: ["reference", "movement-types"] as const,
    queryFn: stockMovementsApi.types,
    ...STATIC,
  });
