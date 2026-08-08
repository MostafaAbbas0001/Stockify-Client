import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routeTree = readFileSync(
  fileURLToPath(new URL("../routeTree.gen.ts", import.meta.url)),
  "utf8",
);

describe("generated route tree", () => {
  it.each([
    "/dashboard/",
    "/expenses/",
    "/expenses/$expenseId",
    "/delivery-charges/",
    "/reports/",
    "/branches/",
    "/users/",
    "/sales/",
    "/customers/$customerId",
    "/employees/$employeeId",
    "/profile",
    "/$",
  ])("contains %s", (path) => {
    expect(routeTree).toContain(`path: '${path}'`);
  });
});
