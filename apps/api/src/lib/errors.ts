import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProd } from "../env.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error"
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, code = "bad_request") {
    return new ApiError(400, message, code);
  }
  static unauthorized(message = "Authentication required", code = "unauthorized") {
    return new ApiError(401, message, code);
  }
  static forbidden(message = "You do not have access to this resource", code = "forbidden") {
    return new ApiError(403, message, code);
  }
  static notFound(message = "Resource not found", code = "not_found") {
    return new ApiError(404, message, code);
  }
  static conflict(message: string, code = "conflict") {
    return new ApiError(409, message, code);
  }
  static tooMany(message = "Too many requests — slow down a little", code = "rate_limited") {
    return new ApiError(429, message, code);
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: "Not found", code: "not_found" } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    res.status(422).json({
      error: {
        message: issue ? `${issue.path.join(".") || "input"}: ${issue.message}` : "Invalid input",
        code: "validation_error",
      },
    });
    return;
  }

  // Multer file-size errors
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: { message: "File is too large (max 10 MB)", code: "file_too_large" } });
      return;
    }
  }

  console.error("[api] unhandled error:", err);
  res.status(500).json({
    error: {
      message: isProd ? "Something went wrong" : String((err as Error)?.message ?? err),
      code: "internal_error",
    },
  });
}
