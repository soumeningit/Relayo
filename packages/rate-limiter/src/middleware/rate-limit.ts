import type { NextFunction, Request, RequestHandler, Response } from "express";
import { RateLimiterService } from "../services/rate-limiter.service.js";
import { enqueueAuditLog } from "../queues/index.js";
import { RateLimitOptions, RateLimitResult } from "../types/index.js";
import { RateLimitRequest } from "./identity-extractor.js";

let service: RateLimiterService | null = null;

function getService(): RateLimiterService {
  if (!service) {
    service = new RateLimiterService();
  }
  return service;
}

export function rateLimit(options: RateLimitOptions = {}): RequestHandler {
  const { skip = () => false, auditDenied = true, onLimited } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (skip(req)) return next();

    const rlReq = req as RateLimitRequest;
    if (!rlReq.rateLimitContext) {
      // extractIdentity never ran — fail open rather than block traffic
      return next();
    }

    const context = rlReq.rateLimitContext;

    // Degraded mode: the host app marks the limiter inactive when Redis was
    // unreachable at startup. While disconnected, ioredis queues commands
    // indefinitely (maxRetriesPerRequest: null) — awaiting them here would
    // hang every request. Fail open instead.
    const limiterActive = req.app?.get("rateLimiterActive");
    if (limiterActive === false) return next();

    try {
      const result = await getService().check(context);

      setHeaders(res, result);

      if (!result.allowed) {
        if (auditDenied) {
          enqueueAuditLog({
            identifier: context.identifier,
            identifierType: context.identifierType,
            route: context.route,
            method: context.method,
            allowed: false,
            limitCount: result.limit,
            remaining: result.remaining,
            configId: result.configId,
            ip: context.ip,
            userAgent: context.userAgent,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        }

        return onLimited
          ? onLimited(res, result)
          : defaultLimitedHandler(res, result);
      }

      next();
    } catch {
      // Fail open on unexpected errors
      next();
    }
  };
}

function setHeaders(res: Response, result: RateLimitResult): void {
  res.set({
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
    "X-RateLimit-Strategy": result.strategy,
  });

  if (!result.allowed && result.retryAfterMs) {
    res.set("Retry-After", Math.ceil(result.retryAfterMs / 1000).toString());
  }
}

function defaultLimitedHandler(res: Response, result: RateLimitResult): void {
  res.status(429).json({
    error: "Too Many Requests",
    message: "Rate limit exceeded. Please try again later.",
    retryAfter: Math.ceil((result.retryAfterMs || 1000) / 1000),
    limit: result.limit,
    remaining: result.remaining,
    resetAt: new Date(result.resetAt).toISOString(),
  });
}
