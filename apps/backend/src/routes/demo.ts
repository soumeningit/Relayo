// apps/backend/src/routes/demo.ts
// Sample endpoint to SEE the rate limiter working end-to-end.
//
//   GET /api/v1/demo/rate-limit
//
// Uses the same SlidingWindowStrategy + Redis pipeline as production,
// with an inline config so it needs nothing else (no DB rows required):
//   limit: 5 requests per 60s window, keyed per client IP.
//
// Hit it 6+ times quickly — requests 1..5 return 200, the rest get 429
// with a Retry-After header until the window slides open again.
import { Router, Request, Response, NextFunction } from "express";
import { SlidingWindowStrategy, RateLimitRequest } from "@repo/rate-limiter";
import type { RateLimitConfig } from "@repo/db";

const router = Router();

const strategy = new SlidingWindowStrategy();

const DEMO_LIMIT = 5;
const DEMO_WINDOW_MS = 60_000;

const demoConfig = {
  id: "demo-inline-limit",
  name: "Demo Inline Limit",
  description: null,
  strategy: "SLIDING_WINDOW",
  identifierType: "IP",
  limit: DEMO_LIMIT,
  windowMs: DEMO_WINDOW_MS,
  burst: null,
  refillRate: null,
  routePattern: "*",
  enabled: true,
  priority: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as RateLimitConfig;

router.get(
  "/rate-limit",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rlReq = req as RateLimitRequest;
      const identifier =
        rlReq.rateLimitContext?.identifier ?? req.ip ?? "unknown";

      const result = await strategy.check(
        `demo:${identifier}`,
        demoConfig,
        rlReq.rateLimitContext!,
      );

      res.set({
        "X-Demo-Limit": String(DEMO_LIMIT),
        "X-Demo-Remaining": String(result.remaining),
        "X-Demo-Reset": new Date(result.resetAt).toISOString(),
      });

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil((result.retryAfterMs ?? 1000) / 1000);
        res.set("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Demo limit hit (${DEMO_LIMIT} req / ${DEMO_WINDOW_MS / 1000}s per IP).`,
          retryAfterSeconds,
          resetAt: new Date(result.resetAt).toISOString(),
          yourIdentifier: identifier,
        });
      }

      return res.status(200).json({
        message: "Request allowed",
        attemptsRemaining: result.remaining,
        limit: DEMO_LIMIT,
        windowSeconds: DEMO_WINDOW_MS / 1000,
        resetsAt: new Date(result.resetAt).toISOString(),
        yourIdentifier: identifier,
        tip: "Keep refreshing — request #6 will be rejected with 429.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
