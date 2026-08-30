import { Router } from "express";
import { validate } from "../middlewares/validate";
import { docSlugParams } from "../validators/docs";
import * as docsController from "../controllers/docs.controller";

const router = Router();

router.get("/", docsController.listDocs);
router.get("/:slug", validate(docSlugParams), docsController.getDoc);

export default router;