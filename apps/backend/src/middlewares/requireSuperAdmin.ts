import { Request, Response, NextFunction } from "express";
import { prisma } from "@repo/db";
import { AuthenticatedRequest } from "./auth";

export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = (req as AuthenticatedRequest).user ?? {};

    if (!id) {
      res.status(401).json({
        success: false,
        error: "Not authenticated",
        message: "Not authenticated",
      });
      return;
    }

    // Fresh DB lookup per request: a demoted/removed super admin loses
    // access immediately (no reliance on a stale role inside the JWT).
    const user = await prisma.user.findUnique({ where: { userId: id } });

    if (!user || user.role !== "SUPER_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Forbidden. Super admin access required.",
        message: "Forbidden. Super admin access required.",
      });
      return;
    }

    (req as AuthenticatedRequest).admin = {
      id: Number(user.id),
      userId: user.userId,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    next(error);
  }
}