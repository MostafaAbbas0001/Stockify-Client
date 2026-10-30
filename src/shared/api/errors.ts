/**
 * Normalizes the two error envelopes the Stockify backend returns:
 *  1. Service envelope: { code, message, traceId? }
 *  2. ASP.NET validation problem: { type, title, status, errors, traceId }
 */

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;
  readonly fieldErrors?: FieldErrors;

  constructor(args: {
    status: number;
    code: string;
    message: string;
    traceId?: string | undefined;
    fieldErrors?: FieldErrors | undefined;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    if (args.traceId) this.traceId = args.traceId;
    if (args.fieldErrors) this.fieldErrors = args.fieldErrors;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isConflict() {
    return this.status === 409;
  }
  get isServerError() {
    return this.status >= 500;
  }
}

function defaultMessageFor(status: number): string {
  if (status === 401) return "Your session is no longer valid.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "The requested record was not found.";
  if (status === 409) return "This action conflicts with the current data.";
  if (status >= 500) return "Something went wrong. Please try again.";
  return "The request could not be completed.";
}

export async function toApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  let payload: unknown = null;

  const contentType = response.headers.get("content-type") ?? "";
  if (status !== 204 && contentType.includes("json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else if (status !== 204) {
    try {
      const text = await response.text();
      payload = text ? { message: text } : null;
    } catch {
      payload = null;
    }
  }

  const body = (payload ?? {}) as Record<string, unknown>;

  // ASP.NET validation problem
  if (body["errors"] && typeof body["errors"] === "object") {
    const raw = body["errors"] as Record<string, unknown>;
    const fieldErrors: FieldErrors = {};
    for (const [key, value] of Object.entries(raw)) {
      const messages = Array.isArray(value) ? value.map(String) : [String(value)];
      fieldErrors[key.charAt(0).toLowerCase() + key.slice(1)] = messages;
    }
    const first = Object.values(fieldErrors)[0]?.[0];
    return new ApiError({
      status,
      code: "VALIDATION_ERROR",
      message:
        first ?? (typeof body["title"] === "string" ? body["title"] : defaultMessageFor(status)),
      traceId: typeof body["traceId"] === "string" ? body["traceId"] : undefined,
      fieldErrors,
    });
  }

  return new ApiError({
    status,
    code: typeof body["code"] === "string" ? body["code"] : `HTTP_${status}`,
    message:
      typeof body["message"] === "string" && body["message"].trim().length > 0
        ? body["message"]
        : typeof body["title"] === "string"
          ? body["title"]
          : defaultMessageFor(status),
    traceId: typeof body["traceId"] === "string" ? body["traceId"] : undefined,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Retry transient failures only; validation/authentication 4xx responses are final. */
export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!isApiError(error)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
