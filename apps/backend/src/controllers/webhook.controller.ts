import { NextFunction, Request, Response } from "express";
import { handleRazorpayWebhook } from "../services/payment.service";

export async function razorpayWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rawBody =
      typeof req.body === "string" ? req.body : req.body?.toString("utf8") ?? "";
    const signature = req.headers["x-razorpay-signature"] as
      | string
      | undefined;

    if (!signature) {
      res.status(400).json({ success: false, message: "Missing signature" });
      return;
    }

    await handleRazorpayWebhook(rawBody, signature);

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}