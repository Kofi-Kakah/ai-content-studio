import type { NextFunction, Request, Response } from "express";
import { verifySession } from "../lib/jwt.js";
import { ApiError } from "../lib/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Extracts and verifies the Bearer JWT issued at login.
 * Populates req.userId / req.userEmail.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(ApiError.unauthorized());
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  const claims = verifySession(token);
  if (!claims) {
    next(new ApiError(401, "Your session has expired — please sign in again", "session_expired"));
    return;
  }

  req.userId = claims.sub;
  req.userEmail = claims.email;
  next();
}
