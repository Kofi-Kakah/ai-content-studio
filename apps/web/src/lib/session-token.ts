import { decode } from "next-auth/jwt";

/**
 * Server-side helper: decrypts the Auth.js session cookie (JWE) and returns
 * the API access token it carries. Used by the BFF proxy so the raw API JWT
 * never has to be exposed in the client-visible session object.
 */

const SECRET = process.env.AUTH_SECRET ?? "";
const COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"] as const;

export async function getApiToken(req: Request): Promise<string | null> {
  if (!SECRET) return null;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      cookies.set(part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim()));
    }
  }

  for (const name of COOKIE_NAMES) {
    const token = cookies.get(name);
    if (!token) continue;
    try {
      const jwt = await decode({ token, secret: SECRET, salt: name });
      const accessToken = (jwt as { accessToken?: unknown } | null)?.accessToken;
      if (typeof accessToken === "string") return accessToken;
    } catch {
      // fall through to the next cookie name
    }
  }

  return null;
}
