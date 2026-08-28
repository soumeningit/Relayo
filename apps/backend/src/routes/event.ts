import { Router } from "express";
import * as eventController from "../controllers/event.controller";
import { validate } from "../middlewares/validate";

import { validateTenant } from "../middlewares/webhook";
import { acceptEventSchema, getEventsSchema } from "../validators/event";
import { authenticate } from "../middlewares/auth";

const router = Router({ mergeParams: true });

router.get(
  "/",
  authenticate,
  validate(getEventsSchema),
  eventController.getEvents,
);

router.use(validateTenant);

router.post(
  "/accept-event",
  validate(acceptEventSchema),
  eventController.acceptEvent,
);

export default router;
