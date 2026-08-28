import { Router } from "express";
import * as destinationController from "../controllers/destination.controller";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createDestinationSchema,
  deleteDestinationSchema,
  getDestinationDetailsSchema,
  getDestinationSchema,
  listDestinationsSchema,
  pauseDestinationSchema,
  resumeDestinationSchema,
  rotateSecretSchema,
} from "../validators/destination";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  "/",
  validate(listDestinationsSchema),
  destinationController.listDestinations,
);

router.get(
  "/:destinationId",
  validate(getDestinationSchema),
  destinationController.getDestination,
);

router.post(
  "/",
  validate(createDestinationSchema),
  destinationController.createDestination,
);

router.patch(
  "/:destinationId/pause",
  validate(pauseDestinationSchema),
  destinationController.pauseDestination,
);

router.patch(
  "/:destinationId/resume",
  validate(resumeDestinationSchema),
  destinationController.resumeDestination,
);

router.post(
  "/:destinationId/rotate-secret",
  validate(rotateSecretSchema),
  destinationController.rotateSecret,
);

router.delete(
  "/:destinationId",
  validate(deleteDestinationSchema),
  destinationController.deleteDestination,
);

router.get(
  "/:destinationId/details",
  validate(getDestinationDetailsSchema),
  destinationController.getDestinationDetails,
);

export default router;
