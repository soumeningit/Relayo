import type { NextFunction, Request, Response } from "express";
import { IdentifierType, RateLimitContext } from "../types/index.js";

export interface RateLimitRequest extends Request {
  rateLimitContext?: RateLimitContext;
}

export function extractIdentity(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const rlReq = req as RateLimitRequest;

  const ip = getClientIp(req);
  const apiKey = rlReq.get("x-api-key");
  const user = (
    rlReq as unknown as { user?: { id?: string; userId?: string; sub?: string } }
  ).user;
  const userId = user?.id || user?.userId || user?.sub;

  let identifierType: IdentifierType;
  let identifier: string;

  if (apiKey) {
    identifierType = "API_KEY";
    identifier = apiKey;
  } else if (userId) {
    identifierType = "USER_ID";
    identifier = userId;
  } else {
    identifierType = "IP";
    identifier = ip;
  }

  rlReq.rateLimitContext = {
    identifier,
    identifierType,
    route: rlReq.route?.path || rlReq.path,
    method: rlReq.method,
    apiKey: apiKey || undefined,
    userId: userId || undefined,
    ip,
    userAgent: rlReq.get("user-agent"),
  };

  next();
}

function getClientIp(req: Request): string {
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || req.ip || "unknown";
  return req.get("x-real-ip") || req.ip || "unknown";
}
