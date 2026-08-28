import { Router } from "express";
import * as apiKeyController from "../controllers/apiKey.controller";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  completeMfaSetupSchema,
  createApiKeySchema,
  listApiKeysSchema,
  revokeApiKeySchema,
  rotateApiKeySchema,
} from "../validators/apiKey";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", validate(listApiKeysSchema), apiKeyController.listKeys);

router.post("/", validate(createApiKeySchema), apiKeyController.createKey);

router.patch(
  "/:keyId/rotate",
  validate(rotateApiKeySchema),
  apiKeyController.rotateKey,
);

router.patch(
  "/:keyId/revoke",
  validate(revokeApiKeySchema),
  apiKeyController.revokeKey,
);

router.post("/mfa/setup", apiKeyController.enableMfa);

router.post(
  "/mfa/complete",
  validate(completeMfaSetupSchema),
  apiKeyController.completeMfaSetup,
);

export default router;
