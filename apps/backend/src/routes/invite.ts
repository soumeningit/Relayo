import { Router } from "express";
import * as inviteController from "../controllers/invite.controller";
import { validate } from "../middlewares/validate";
import {
  inviteTokenParamsSchema,
  respondInviteSchema,
} from "../validators/org";

const router = Router();

router.get("/:token", validate(inviteTokenParamsSchema), inviteController.details);

router.post("/respond", validate(respondInviteSchema), inviteController.respond);

export default router;