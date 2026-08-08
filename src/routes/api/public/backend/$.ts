import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin passthrough to the Stockify backend.
 *
 * The backend documentation states no CORS policy is configured, so the browser
 * calls `/api/public/backend/<path>` on this origin and this handler forwards it
 * to `<STOCKIFY_API_URL>/api/<path>`, preserving method, body, Authorization
 * header and response headers (including Content-Disposition for .xlsx reports).
 *
 * Security: this proxy adds no credentials of its own. Every forwarded request
 * carries only what the caller sent, so the backend remains the authority for
 * authentication and permissions.
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "host",
  "content-length",
]);

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const base = process.env["STOCKIFY_API_URL"];
  if (!base) {
    return jsonError(
      503,
      "BACKEND_NOT_CONFIGURED",
      "The Stockify backend URL is not configured for this deployment.",
    );
  }

  const incoming = new URL(request.url);
  const path = params._splat ?? "";
  const target = new URL(`${base.replace(/\/+$/, "")}/api/${path.replace(/^\/+/, "")}`);
  target.search = incoming.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("accept-encoding", "identity");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : null;

  try {
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
    });

    return new Response(upstream.status === 204 ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Stockify backend proxy failure", error);
    return jsonError(
      502,
      "BACKEND_UNREACHABLE",
      "Could not reach the Stockify backend. Check the server URL and that the server is running.",
    );
  }
}

export const Route = createFileRoute("/api/public/backend/$")({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      PATCH: proxy,
      DELETE: proxy,
      HEAD: proxy,
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
