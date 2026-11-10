import type { NextFunction, Request, Response } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, redisEnabled } from "../env.js";
import { ApiError } from "./errors.js";

/**
 * Rate limiting backed by Upstash Redis when configured, with an in-process
 * sliding-window fallback so local development works with zero setup.
 */

interface LimiterOptions {
  /** Identifier prefix, e.g. "ai", "auth" */
  name: string;
  limit: number;
  windowSeconds: number;
}

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(opts: LimiterOptions): Ratelimit {
  const existing = upstashLimiters.get(opts.name);
  if (existing) return existing;

  const ratelimit = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowSeconds} s`),
    prefix: `ratelimit:${opts.name}`,
    analytics: false,
  });
  upstashLimiters.set(opts.name, ratelimit);
  return ratelimit;
}

// ---- in-memory fallback --------------------------------------------------

const buckets = new Map<string, number[]>();

function memoryHit(key: string, windowSeconds: number): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    // crude cleanup to bound memory
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

function memoryCount(key: string, windowSeconds: number): number {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowSeconds * 1000);
  return hits.length;
}

// --------------------------------------------------------------------------

export function rateLimit(opts: LimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const identifier = `${ip}`;

    try {
      if (redisEnabled) {
        const limiter = getUpstashLimiter(opts);
        const result = await limiter.limit(identifier);
        res.setHeader("X-RateLimit-Limit", String(opts.limit));
        res.setHeader("X-RateLimit-Remaining", String(result.remaining));
        if (!result.success) {
          throw ApiError.tooMany(
            `Rate limit reached — up to ${opts.limit} requests per ${opts.windowSeconds}s. Try again shortly.`
          );
        }
      } else {
        memoryHit(`${opts.name}:${identifier}`, opts.windowSeconds);
        const used = memoryCount(`${opts.name}:${identifier}`, opts.windowSeconds);
        if (used > opts.limit) {
          throw ApiError.tooMany(
            `Rate limit reached — up to ${opts.limit} requests per ${opts.windowSeconds}s. Try again shortly.`
          );
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
