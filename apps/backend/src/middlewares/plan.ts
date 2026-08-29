import { NextFunction, Request, Response } from "express";
import { prisma } from "@repo/db";
import { AppError } from "../errors/AppError";

/**
 * Guards paid-only routes (e.g. delivery replay). A paid plan is only "active"
 * while its one-time 30-day period (currentPeriodEnd) has not lapsed — after
 * that the org must pay once again to continue.
 */
export async function requireActivePaidPlan(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier?: string };
    if (!identifier) {
      return next();
    }

    const org = await prisma.organization.findFirst({
      where: { OR: [{ slug: identifier }, { organizationId: identifier }] },
      select: {
        PaymentType: true,
        paymentStatus: true,
        currentPeriodEnd: true,
      },
    });

    const isPaid =
      org && (org.PaymentType === "PRO" || org.PaymentType === "SCALE");
    const withinPeriod =
      isPaid &&
      org!.paymentStatus === "ACTIVE" &&
      (!org!.currentPeriodEnd ||
        org!.currentPeriodEnd.getTime() > Date.now());

    if (!withinPeriod) {
      throw new AppError(
        "This feature requires an active paid plan. Pay once for a 30-day period to continue.",
        402,
        "PAID_PLAN_REQUIRED",
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
}