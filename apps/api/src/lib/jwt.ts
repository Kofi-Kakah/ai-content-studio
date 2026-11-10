import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface SessionClaims {
  /** user id */
  sub: string;
  email: string;
  name: string | null;
}

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, env.AUTH_SECRET, {
    expiresIn: TTL_SECONDS,
    issuer: "ai-content-studio",
  });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    const payload = jwt.verify(token, env.AUTH_SECRET, {
      issuer: "ai-content-studio",
    });
    if (typeof payload === "string" || typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
