import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  signupSchema,
  signinSchema,
  verifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setupMfaSchema,
  verifyMfaSchema,
} from "../validators/auth.js";

const router = Router();

router.post("/signup", validate(signupSchema), authController.register);

router.post("/verify", validate(verifySchema), authController.verify);

router.post("/setup-mfa", validate(setupMfaSchema), authController.setupMfa);

router.post("/signin", validate(signinSchema), authController.login);

router.post("/verify-mfa", validate(verifyMfaSchema), authController.verifyMfa);

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;
