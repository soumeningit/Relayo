import { Router } from "express";
import * as adminAuthController from "../controllers/adminAuth.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  adminSigninSchema,
  adminVerifyMfaSchema,
} from "../validators/admin.js";

const router = Router();

router.post("/signin", validate(adminSigninSchema), adminAuthController.adminSignin);

router.post(
  "/verify-mfa",
  validate(adminVerifyMfaSchema),
  adminAuthController.adminVerifyMfa,
);

export default router;