import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import * as deliveryController from "../controllers/delivery.controller";
import { validate } from "../middlewares/validate";
import {
  listDeliverySchema,
  replayDeliverySchema,
} from "../validators/delivery";

const router = Router();

router.use(authenticate);

router.get(
  "/:identifier/deliveries",
  validate(listDeliverySchema),
  deliveryController.listDeliveries,
);

router.post(
  "/:identifier/deliveries/:deliveryId/replay",
  validate(replayDeliverySchema),
  deliveryController.replayDelivery,
);

export default router;
