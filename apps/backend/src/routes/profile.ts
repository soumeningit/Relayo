import { Router } from "express";
import * as profileController from "../controllers/profile.controller";
import { upload } from "../configs/multer";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  updateAddressSchema,
  updateProfileSchema,
} from "../validators/profile";

const router = Router();

router.use(authenticate);

router.get("/", profileController.getProfile);

router.patch(
  "/",
  upload.single("avatar"),
  validate(updateProfileSchema),
  profileController.updateProfile,
);

router.patch(
  "/address",
  validate(updateAddressSchema),
  profileController.updateAddress,
);

export default router;