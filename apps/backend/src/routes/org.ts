import { Router } from "express";
import * as orgController from "../controllers/org.controller";
import * as deliveryController from "../controllers/delivery.controller";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createOrgSchema,
  deliveryDetailsSchema,
  inviteMemberSchema,
  inviteParamsSchema,
  lookupInviteeSchema,
  memberParamsSchema,
  orgIdentifierSchema,
  submitOrgDetailsSchema,
  submitPaymentDetailsSchema,
  updateMemberRoleSchema,
  updateOrgSchema,
  verifyPaymentSchema,
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

router.post(
  "/:identifier/payment/verify",
  validate(orgIdentifierSchema),
  validate(verifyPaymentSchema),
  orgController.verifyPayment,
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

// ---------- Members & invitations ----------

router.get(
  "/:identifier/members",
  validate(orgIdentifierSchema),
  orgController.listMembers,
);

router.post(
  "/:identifier/members/invite",
  validate(inviteMemberSchema),
  orgController.inviteMember,
);

router.post(
  "/:identifier/members/lookup",
  validate(lookupInviteeSchema),
  orgController.lookupInvitee,
);

router.patch(
  "/:identifier/members/:memberId/role",
  validate(updateMemberRoleSchema),
  orgController.changeMemberRole,
);

router.delete(
  "/:identifier/members/:memberId",
  validate(memberParamsSchema),
  orgController.removeMember,
);

router.delete(
  "/:identifier/members/invitations/:inviteId",
  validate(inviteParamsSchema),
  orgController.revokeInvitation,
);

router.post(
  "/:identifier/members/invitations/:inviteId/resend",
  validate(inviteParamsSchema),
  orgController.resendInvitation,
);

export default router;
