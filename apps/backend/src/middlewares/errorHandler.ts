import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

const RETRYABLE_RETRY_AFTER_SECONDS = 5;

// Transient infrastructure failures the client may safely retry. Returning
// 503 (instead of a generic 500) keeps load-test server_error rates honest:
// these mean "try again", not "your payload was rejected".
function isRetryableServiceUnavailable(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (
    code === "P2034" || // write conflict / deadlock
    code === "P2024" || // too many database connections (pool exhausted)
    code === "P1008" || // operations timed out
    code === "P1017" || // server closed the connection unexpectedly
    code === "ECONNRESET" ||
    code === "ETIMEDOUT"
  ) {
    return true;
  }

  // pg pool returns a plain Error with this message when connectionTimeoutMillis
  // elapses while waiting for a free connection.
  const message =
    err instanceof Error ? err.message : err ? String(err) : "";
  return /timeout expired|timed out|too many clients/i.test(message);
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
      code: err.code,
    });
  }

  if (isRetryableServiceUnavailable(err)) {
    return res.status(503).json({
      success: false,
      error: "Service temporarily unavailable. Please retry.",
      message: "Service temporarily unavailable. Please retry.",
      code: (err as { code?: string })?.code,
      retryAfter: RETRYABLE_RETRY_AFTER_SECONDS,
    });
  }

  const msg = err instanceof Error ? err.message : "Internal server error";
  const status = (err as any).statusCode || (err as any).status || 500;

  return res.status(status).json({
    success: false,
    error: msg,
    message: msg,
  });
};