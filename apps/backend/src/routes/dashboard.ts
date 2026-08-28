import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { getDashboardOverviewSchema } from "../validators/dashboard";

const router = Router();

router.use(authenticate);

router.get(
  "/:identifier/overview",
  validate(getDashboardOverviewSchema),
  dashboardController.getDashboardOverview,
);

export default router;