import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import * as adminDocsController from "../controllers/adminDocs.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin.js";
import { validate } from "../middlewares/validate.js";
import {
  changeOrganizationPlanSchema,
  exportParams,
  listAuditQuery,
  listDeliveriesQuery,
  listEventsQuery,
  listOrganizationsQuery,
  listPaymentsQuery,
  listUsersQuery,
  searchQuery,
  updateAdminProfileSchema,
  updateFeatureFlagSchema,
  updateOrganizationNotesSchema,
  updateOrganizationStatusSchema,
  updateUserStatusSchema,
} from "../validators/admin.js";
import {
  createDocSchema,
  deleteDocParams,
  updateDocSchema,
} from "../validators/docs.js";

const router = Router();

// Every route below requires an authenticated SUPER_ADMIN.
router.use(authenticate, requireSuperAdmin);

/* ---------- Profile ---------- */
router.get("/auth/profile", adminController.getAdminProfile);
router.patch(
  "/auth/profile",
  validate(updateAdminProfileSchema),
  adminController.updateAdminProfile,
);

/* ---------- Overview ---------- */
router.get("/overview", adminController.getAdminOverview);

/* ---------- Organizations ---------- */
router.get(
  "/organizations",
  validate(listOrganizationsQuery),
  adminController.listOrganizations,
);
router.get("/organizations/:id", adminController.getOrganization);
router.patch(
  "/organizations/:id/status",
  validate(updateOrganizationStatusSchema),
  adminController.updateOrganizationStatus,
);
router.patch(
  "/organizations/:id/plan",
  validate(changeOrganizationPlanSchema),
  adminController.changeOrganizationPlan,
);
router.post("/organizations/:id/extend", adminController.extendOrganizationPeriod);
router.delete("/organizations/:id", adminController.deleteOrganization);
router.get("/organizations/:id/notes", adminController.getOrganizationNotes);
router.put(
  "/organizations/:id/notes",
  validate(updateOrganizationNotesSchema),
  adminController.updateOrganizationNotes,
);

/* ---------- Users ---------- */
router.get("/users", validate(listUsersQuery), adminController.listUsers);
router.patch(
  "/users/:id/status",
  validate(updateUserStatusSchema),
  adminController.updateUserStatus,
);
router.post("/users/:id/reset-password", adminController.resetUserPassword);
router.post("/users/:id/disable-mfa", adminController.disableUserMfa);

/* ---------- Payments ---------- */
router.get("/payments", validate(listPaymentsQuery), adminController.listPayments);
router.post("/payments/:id/refund", adminController.refundPayment);
router.post("/payments/:id/retry", adminController.retryPayment);

/* ---------- Revenue / usage / churn ---------- */
router.get("/revenue", adminController.getRevenue);
router.get("/usage", adminController.getUsage);
router.get("/churn", adminController.listExpiredOrganizations);

/* ---------- Operations ---------- */
router.get("/destinations", adminController.listDestinations);
router.get("/events", validate(listEventsQuery), adminController.listEvents);
router.get("/events/:id", adminController.getEvent);
router.get(
  "/deliveries",
  validate(listDeliveriesQuery),
  adminController.listDeliveries,
);
router.get("/deliveries/:id", adminController.getDelivery);
router.get("/incidents", adminController.listIncidents);
router.get("/incidents/open", adminController.listOpenIncidents);
router.get("/health", adminController.getHealth);

/* ---------- Audit / search / flags / config / export ---------- */
router.get("/audit", validate(listAuditQuery), adminController.listAudit);
router.get("/search", validate(searchQuery), adminController.search);
router.get("/flags", adminController.listFlags);
router.patch(
  "/flags/:id",
  validate(updateFeatureFlagSchema),
  adminController.updateFlag,
);
router.get("/config", adminController.getConfig);
router.get("/export/:kind", validate(exportParams), adminController.exportCsv);

/* ---------- Docs ---------- */
router.get("/docs", adminDocsController.listDocs);
router.get("/docs/:id", adminDocsController.getDoc);
router.post("/docs", validate(createDocSchema), adminDocsController.createDoc);
router.patch(
  "/docs/:id",
  validate(updateDocSchema),
  adminDocsController.updateDoc,
);
router.delete(
  "/docs/:id",
  validate(deleteDocParams),
  adminDocsController.deleteDoc,
);

export default router;