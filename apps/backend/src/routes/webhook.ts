import express, { Router } from "express";
import * as webhookController from "../controllers/webhook.controller";

const router = Router();

// Raw body parser — Razorpay signs the exact bytes of the request body, so
// this MUST NOT pass through the global express.json() parser.
router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  webhookController.razorpayWebhook,
);

export default router;