import { prisma } from "@repo/db";
import { NextFunction, Request, Response } from "express";
import { hashApiKey } from "../utils/helper";

export interface AuthenticatedRequest extends Request {
  org?: {
    id: string;
  };
}

export async function validateTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentication required.",
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    res.status(401).json({
      error: "Invalid API key.",
    });
    return;
  }

  try {
    const tokenHash = hashApiKey(token);

    const apiKey = await prisma.apiKey.findUnique({
      where: {
        keyHash: tokenHash,
      },
    });

    if (!apiKey || apiKey.revokedAt) {
      res.status(401).json({ error: "Invalid or revoked API key." });
      return;
    }

    (req as AuthenticatedRequest).org = {
      id: apiKey.organizationId.toString(),
    };

    next();
  } catch (error) {
    res.status(500).json({
      error: "Internal server error.",
    });
  }
}
