import type { NextRequest } from "next/server";
import { getApiToken } from "@/lib/session-token";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Backend-for-frontend proxy. The browser only ever talks to this route;
 * we attach the API session JWT server-side so the token never reaches
 * client JavaScript. Response bodies (including SSE streams from /ai/chat)
 * are piped through untouched.
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

async function proxy(req: NextRequest): Promise<Response> {
  const accessToken = await getApiToken(req);

  // /api/v1/<rest>  →  <API_URL>/api/v1/<rest>
  const path = req.nextUrl.pathname.replace(/^\/api\/v1/, "");
  const target = new URL(`${API_URL}/api/v1${path}${req.nextUrl.search}`);

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("Authorization");
  }
  // Let undici decide compression with the upstream; avoid passing the
  // browser's accept-encoding so we can forward decoded bodies cleanly.
  headers.delete("accept-encoding");

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.body) {
    init.body = req.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return Response.json(
      { error: { message: "API server is unreachable — is it running?", code: "api_unreachable" } },
      { status: 502 }
    );
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!HOP_BY_HOP.has(k) && k !== "content-encoding" && k !== "content-length") {
      resHeaders.set(key, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
  proxy as HEAD,
  proxy as OPTIONS,
};
