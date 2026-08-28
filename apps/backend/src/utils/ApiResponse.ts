import { Response } from "express";

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    // Keep standard types like Dates as strings or dates
    if (obj instanceof Date) return obj.toISOString();

    // Handle Prisma Decimal objects specifically to avoid traversing their internal representation
    if (
      obj.constructor?.name === "Decimal" ||
      (typeof obj.toFixed === "function" && "d" in obj && "e" in obj)
    ) {
      return obj.toString();
    }

    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = serializeBigInt(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export function sendSuccess(
  res: Response,
  data: any = null,
  message: string = "Success",
  statusCode: number = 200,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: serializeBigInt(data),
  });
}

export function sendError(
  res: Response,
  error: string = "An error occurred",
  statusCode: number = 400,
) {
  return res.status(statusCode).json({
    success: false,
    error,
    message: error,
  });
}
