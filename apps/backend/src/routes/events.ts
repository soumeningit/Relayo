import { Router } from "express";
import * as eventController from "../controllers/event.controller";
import { validate } from "../middlewares/validate";

import { getEventDetailsSchema, getEventsSchema } from "../validators/events";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get(
  "/:identifier",
  validate(getEventsSchema),
  eventController.getEvents,
);

router.get(
  "/:identifier/details/:eventId",
  validate(getEventDetailsSchema),
  eventController.getEventDetails,
);

export default router;
