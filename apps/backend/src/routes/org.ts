import { Router } from "express";
import * as orgController from "../controllers/org.controller";
import * as deliveryController from "../controllers/delivery.controller";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createOrgSchema,
  deliveryDetailsSchema,
  orgIdentifierSchema,
  submitOrgDetailsSchema,
  submitPaymentDetailsSchema,
  updateOrgSchema,
} from "../validators/org";
import { listDeliverySchema } from "../validators/delivery";

const router = Router();

// Every organization route requires a signed-in user
router.use(authenticate);

router.post("/", validate(createOrgSchema), orgController.create);

// Must be registered before "/:identifier" so it isn't captured as a slug
router.get("/mine", orgController.getMine);

router.get(
  "/:identifier",
  validate(orgIdentifierSchema),
  orgController.getDetails,
);

router.patch(
  "/:identifier",
  validate(orgIdentifierSchema),
  validate(updateOrgSchema),
  orgController.updateBasic,
);

router.patch(
  "/:identifier/payment",
  validate(submitPaymentDetailsSchema),
  orgController.submitPaymentDetails,
);

router.patch(
  "/:identifier/details",
  validate(orgIdentifierSchema),
  validate(submitOrgDetailsSchema),
  orgController.submitDetails,
);

router.get(
  "/de-details",
  validate(deliveryDetailsSchema),
  orgController.getDeliveryDetails,
);

export default router;
