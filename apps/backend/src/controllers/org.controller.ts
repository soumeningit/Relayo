import { Request, Response, NextFunction } from "express";
import * as orgService from "../services/org.service";
import { sendSuccess } from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../middlewares/auth";
import { PaymentPlanType } from "../type";
import * as deliveryService from "../services/delivery.service";

type OrganizationRoleType = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;

    const result = await orgService.createOrganization({
      name: req.body.name,
      orgEmail: req.body.orgEmail,
      metaData: req.body.metaData,
      creatorPublicId: user.id,
    });

    return sendSuccess(
      res,
      result.data,
      result.alreadyExists
        ? "You already own an organization."
        : "Organization created successfully.",
      result.alreadyExists ? 200 : 201,
    );
  } catch (error) {
    next(error);
  }
}

export async function getMine(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (_req as AuthenticatedRequest).user!;
    const organizations = await orgService.getMyOrganizations(user.id);
    return sendSuccess(res, organizations);
  } catch (error) {
    next(error);
  }
}

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };
    const organization = await orgService.getOrganizationDetails(identifier);
    return sendSuccess(res, organization);
  } catch (error) {
    next(error);
  }
}

export async function updateBasic(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };

    const updated = await orgService.updateOrganization({
      identifier,
      name: req.body.name,
      contactEmail: req.body.contactEmail,
    });

    return sendSuccess(res, updated, "Organization updated successfully.", 200);
  } catch (error) {
    next(error);
  }
}

export async function submitPaymentDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };

    const planType = req.body.planType as PaymentPlanType;

    const response = await orgService.submitPaymentDetails(
      identifier,
      planType,
    );

    return sendSuccess(res, response.data, response.message, 200);
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const result = await orgService.verifyPayment(identifier, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (result.captured) {
      return sendSuccess(
        res,
        result,
        "Payment successful. Your plan is active.",
        200,
      );
    }

    return sendSuccess(res, result, result.message, 202);
  } catch (error) {
    next(error);
  }
}

export async function submitDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };

    const result = await orgService.submitOrganizationDetails({
      identifier,
      description: req.body.description,
      website: req.body.website,
      address: req.body.address,
      phone: req.body.phone,
      metaData: req.body.metaData,
    });

    return sendSuccess(res, result.data, result.message, 200);
  } catch (error) {
    next(error);
  }
}

export async function getDeliveryDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log(
    "Fetching delivery details for organization:",
    req.params.identifier,
  );

  try {
    const { identifier } = req.params as { identifier: string };
    const organization = await deliveryService.listDeliveries(identifier);
    return sendSuccess(res, organization);
  } catch (error) {
    next(error);
  }
}

export async function inviteMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { identifier } = req.params as { identifier: string };

    const result = await orgService.inviteMemberToOrganization(
      user.id,
      identifier,
      req.body.email,
      req.body.role as OrganizationRoleType,
    );

    return sendSuccess(res, result, result.message, 201);
  } catch (error) {
    next(error);
  }
}

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { identifier } = req.params as { identifier: string };
    const result = await orgService.listMembers(user.id, identifier);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function lookupInvitee(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { identifier } = req.params as { identifier: string };

    const result = await orgService.lookupInvitee(
      user.id,
      identifier,
      req.body.email,
    );

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { identifier, memberId } = req.params as {
      identifier: string;
      memberId: string;
    };

    const result = await orgService.removeMember(
      user.id,
      identifier,
      Number(memberId),
    );

    return sendSuccess(res, result, "Member removed successfully.", 200);
  } catch (error) {
    next(error);
  }
}

export async function changeMemberRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { identifier, memberId } = req.params as {
      identifier: string;
      memberId: string;
    };

    const result = await orgService.updateMemberRole(
      user.id,
      identifier,
      Number(memberId),
      req.body.role,
    );

    return sendSuccess(res, result, "Member role updated.", 200);
  } catch (error) {
    next(error);
  }
}

export async function revokeInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { identifier, inviteId } = req.params as {
      identifier: string;
      inviteId: string;
    };

    const result = await orgService.revokeInvitation(
      user.id,
      identifier,
      Number(inviteId),
    );

    return sendSuccess(res, result, "Invitation cancelled.", 200);
  } catch (error) {
    next(error);
  }
}

export async function resendInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { identifier, inviteId } = req.params as {
      identifier: string;
      inviteId: string;
    };

    const result = await orgService.resendInvitation(
      user.id,
      identifier,
      Number(inviteId),
    );

    return sendSuccess(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
}
