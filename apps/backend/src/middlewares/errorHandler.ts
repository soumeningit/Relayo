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

// Errors originating below the application layer (Prisma, pg driver, JWT payload
// serialization, ...). Their messages can leak table/column names, SQL fragments or
// internal stack details, so they must never be echoed back to the client — only the
// safe error handler must translate them.
function isDatabaseOrInternalError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const record = err as unknown as Record<string, unknown>;
  const name = err.constructor?.name ?? "";
  const code = typeof record.code === "string" ? record.code : "";
  const message = err.message;

  // Prisma client errors (KnownRequest/UnknownRequest/Validation/RustPanic/
  // Initialization and engine translation errors) expose clientVersion, meta or a
  // P<code4> error code.
  if (name.includes("Prisma") || record.clientVersion !== undefined) {
    return true;
  }
  if (/^P\d{4}$/.test(code)) return true;
  if (record.meta !== undefined && typeof record.meta === "object") {
    return true;
  }

  // Raw node-postgres errors carry SQLSTATE code + PG diagnostic fields (routine,
  // detail, hint, table, constraint); their messages may embed schema/SQL internals.
  if (/^[A-Z0-9]{5}$/.test(code) && /^[0-9]/.test(code)) return true;
  if (
    typeof record.routine === "string" ||
    typeof record.detail === "string" ||
    typeof record.constraint === "string"
  ) {
    return true;
  }

  // Internal (de)serialization failures, e.g. jsonwebtoken JSON.stringify on a Prisma
  // BigInt ([BigInt64Array] values are not JSON-serializable).
  if (/serialize a BigInt|Converting circular structure to JSON/i.test(message)) {
    return true;
  }

  return false;
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

  if (isDatabaseOrInternalError(err)) {
    return res.status(500).json({
      success: false,
      error: "Internal server error.",
      message: "Internal server error.",
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