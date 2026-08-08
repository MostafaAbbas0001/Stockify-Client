import { describe, expect, it } from "vitest";

import { ApiError, shouldRetryRequest, toApiError } from "./errors";

describe("toApiError", () => {
  it("parses service envelopes", async () => {
    const error = await toApiError(
      new Response(
        JSON.stringify({ code: "CONFLICT", message: "Already exists", traceId: "trace-1" }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );
    expect(error).toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Already exists",
      traceId: "trace-1",
    });
  });

  it("normalizes ASP.NET validation errors", async () => {
    const error = await toApiError(
      new Response(
        JSON.stringify({
          title: "Invalid",
          errors: { Username: ["Required"] },
          traceId: "trace-2",
        }),
        { status: 400, headers: { "content-type": "application/problem+json" } },
      ),
    );
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.fieldErrors).toEqual({ username: ["Required"] });
    expect(error.traceId).toBe("trace-2");
  });
});

describe("shouldRetryRequest", () => {
  it("does not retry validation failures", () => {
    expect(
      shouldRetryRequest(
        0,
        new ApiError({ status: 400, code: "BAD_REQUEST", message: "Invalid request" }),
      ),
    ).toBe(false);
  });

  it("retries transient server failures at most twice", () => {
    const error = new ApiError({ status: 503, code: "UNAVAILABLE", message: "Unavailable" });
    expect(shouldRetryRequest(0, error)).toBe(true);
    expect(shouldRetryRequest(1, error)).toBe(true);
    expect(shouldRetryRequest(2, error)).toBe(false);
  });
});
