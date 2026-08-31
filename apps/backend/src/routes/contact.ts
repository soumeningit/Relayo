import { Router } from "express";
import { validate } from "../middlewares/validate";
import { submitContactSchema } from "../validators/contact";
import * as contactController from "../controllers/contact.controller";

const router = Router();

router.post("/", validate(submitContactSchema), contactController.submitContact);

export default router;
