import { Request, Response, NextFunction } from "express";
import { z } from "zod";

type RequestData = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

export const validate = <T extends z.ZodType<RequestData>>(schema: T) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Express 5: req.query and req.params are read-only.
      // Only replace req.body if this schema actually declared one —
      // otherwise a params-only schema would wipe req.body for the
      // next middleware in the chain.
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.slice(1).join("."),
            message: issue.message,
          })),
        });

        return;
      }

      console.error("Validation error:", error);

      res.status(500).json({
        error: "Internal server validation error",
      });
    }
  };
};
