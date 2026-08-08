// Compatibility barrel. Endpoint implementations live in domain modules under
// ./endpoints so features can migrate to direct domain imports incrementally.
export * from "./endpoints/analytics";
export * from "./endpoints/auth";
export * from "./endpoints/catalog";
export * from "./endpoints/expenses";
export * from "./endpoints/inventory";
export * from "./endpoints/orders";
export * from "./endpoints/people";
export * from "./endpoints/pos";
export * from "./endpoints/reference";
export * from "./endpoints/sales";
export * from "./endpoints/shared";
