import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { sendSuccess } from "../utils/ApiResponse";
import * as adminService from "../services/admin.service";
import * as adminOpsService from "../services/adminOps.service";

function ctx(req: Request): adminService.Context {
  const admin = (req as AuthenticatedRequest).admin!;
  return { admin: { id: admin.id, email: admin.email }, ip: req.ip };
}

/* ---------- Profile ---------- */

export async function getAdminProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.getAdminProfile(ctx(req));
    return sendSuccess(res, data, "Admin profile fetched");
  } catch (error) {
    next(error);
  }
}

export async function updateAdminProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.updateAdminProfile(ctx(req), req.body.name);
    return sendSuccess(res, data, "Admin profile updated");
  } catch (error) {
    next(error);
  }
}

/* ---------- Overview ---------- */

export async function getAdminOverview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.getAdminOverview();
    return sendSuccess(res, data, "Overview fetched");
  } catch (error) {
    next(error);
  }
}

/* ---------- Organizations ---------- */

export async function listOrganizations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.listAdminOrganizations(
      (req.query.search as string | undefined) ?? undefined,
      {
        page: Number(req.query.page),
        pageSize: Number(req.query.pageSize),
      },
    );
    return sendSuccess(res, data, "Organizations fetched");
  } catch (error) {
    next(error);
  }
}

export async function getOrganization(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.getAdminOrganization((req.params.id as string));
    return sendSuccess(res, data, "Organization fetched");
  } catch (error) {
    next(error);
  }
}

export async function updateOrganizationStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.updateOrganizationStatus(
      ctx(req),
      (req.params.id as string),
      req.body.status,
    );
    return sendSuccess(res, data, "Organization status updated");
  } catch (error) {
    next(error);
  }
}

export async function changeOrganizationPlan(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.changeOrganizationPlan(
      ctx(req),
      (req.params.id as string),
      req.body.plan,
    );
    return sendSuccess(res, data, "Organization plan changed");
  } catch (error) {
    next(error);
  }
}

export async function extendOrganizationPeriod(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.extendOrganizationPeriod(ctx(req), (req.params.id as string));
    return sendSuccess(res, data, "Billing period extended");
  } catch (error) {
    next(error);
  }
}

export async function deleteOrganization(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await adminService.deleteOrganization(ctx(req), (req.params.id as string));
    return sendSuccess(res, null, "Organization deleted");
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationNotes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.getOrganizationNotes((req.params.id as string));
    return sendSuccess(res, { notes: data }, "Notes fetched");
  } catch (error) {
    next(error);
  }
}

export async function updateOrganizationNotes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.updateOrganizationNotes(
      ctx(req),
      (req.params.id as string),
      req.body.notes,
    );
    return sendSuccess(res, { notes: data }, "Notes updated");
  } catch (error) {
    next(error);
  }
}

/* ---------- Users ---------- */

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.listAdminUsers(
      (req.query.search as string | undefined) ?? undefined,
      {
        page: Number(req.query.page),
        pageSize: Number(req.query.pageSize),
      },
    );
    return sendSuccess(res, data, "Users fetched");
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.updateUserStatus(
      ctx(req),
      (req.params.id as string),
      req.body.status,
    );
    return sendSuccess(res, data, "User status updated");
  } catch (error) {
    next(error);
  }
}

export async function resetUserPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.resetUserPassword(ctx(req), (req.params.id as string));
    return sendSuccess(res, data, "Password reset email sent");
  } catch (error) {
    next(error);
  }
}

export async function disableUserMfa(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.disableUserMfa(ctx(req), (req.params.id as string));
    return sendSuccess(res, data, "MFA disabled");
  } catch (error) {
    next(error);
  }
}

/* ---------- Payments ---------- */

export async function listPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.listAdminPayments(
      (req.query.status as string | undefined) ?? undefined,
    );
    return sendSuccess(res, data, "Payments fetched");
  } catch (error) {
    next(error);
  }
}

export async function refundPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.refundPayment(ctx(req), (req.params.id as string));
    return sendSuccess(res, data, "Payment refunded");
  } catch (error) {
    next(error);
  }
}

export async function retryPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.retryPayment(ctx(req), (req.params.id as string));
    return sendSuccess(res, data, "Payment retried");
  } catch (error) {
    next(error);
  }
}

/* ---------- Revenue / usage / churn ---------- */

export async function getRevenue(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getAdminRevenue();
    return sendSuccess(res, data, "Revenue fetched");
  } catch (error) {
    next(error);
  }
}

export async function listExpiredOrganizations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.listExpiredOrganizations();
    return sendSuccess(res, data, "Expired organizations fetched");
  } catch (error) {
    next(error);
  }
}

export async function getUsage(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getAdminUsage();
    return sendSuccess(res, data, "Usage fetched");
  } catch (error) {
    next(error);
  }
}

/* ---------- Operations (destinations/events/deliveries/incidents/health) ---------- */

export async function listDestinations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminOpsService.listAdminDestinations();
    return sendSuccess(res, data, "Destinations fetched");
  } catch (error) {
    next(error);
  }
}

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.listAdminEvents(
      {
        organizationId: (req.query.organizationId as string | undefined) ?? undefined,
        eventType: (req.query.eventType as string | undefined) ?? undefined,
        search: (req.query.search as string | undefined) ?? undefined,
      },
      {
        page: Number(req.query.page),
        pageSize: Number(req.query.pageSize),
      },
    );
    return sendSuccess(res, data, "Events fetched");
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.getAdminEvent((req.params.id as string));
    return sendSuccess(res, data, "Event fetched");
  } catch (error) {
    next(error);
  }
}

export async function listDeliveries(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminOpsService.listAdminDeliveries(
      {
        organizationId: (req.query.organizationId as string | undefined) ?? undefined,
        status: (req.query.status as string | undefined) ?? undefined,
        destinationId: (req.query.destinationId as string | undefined) ?? undefined,
        eventId: (req.query.eventId as string | undefined) ?? undefined,
        search: (req.query.search as string | undefined) ?? undefined,
      },
      {
        page: Number(req.query.page),
        pageSize: Number(req.query.pageSize),
      },
    );
    return sendSuccess(res, data, "Deliveries fetched");
  } catch (error) {
    next(error);
  }
}

export async function getDelivery(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.getAdminDelivery((req.params.id as string));
    return sendSuccess(res, data, "Delivery fetched");
  } catch (error) {
    next(error);
  }
}

export async function listIncidents(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.listAdminIncidents();
    return sendSuccess(res, data, "Incidents fetched");
  } catch (error) {
    next(error);
  }
}

export async function listOpenIncidents(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminOpsService.listOpenIncidents();
    return sendSuccess(res, data, "Open incidents fetched");
  } catch (error) {
    next(error);
  }
}

export async function getHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.getAdminHealth();
    return sendSuccess(res, data, "Health fetched");
  } catch (error) {
    next(error);
  }
}

/* ---------- Audit / search / flags / config ---------- */

export async function listAudit(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.listAuditEntries({
      category: (req.query.category as string | undefined) ?? undefined,
      actorType: (req.query.actorType as string | undefined) ?? undefined,
      query: (req.query.query as string | undefined) ?? undefined,
    });
    return sendSuccess(res, data, "Audit entries fetched");
  } catch (error) {
    next(error);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getAdminSearch(
      (req.query.q as string | undefined) ?? "",
    );
    return sendSuccess(res, data, "Search results fetched");
  } catch (error) {
    next(error);
  }
}

export async function listFlags(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.getFeatureFlags();
    return sendSuccess(res, data, "Feature flags fetched");
  } catch (error) {
    next(error);
  }
}

export async function updateFlag(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.updateFeatureFlag(
      ctx(req),
      (req.params.id as string),
      req.body.enabled,
    );
    return sendSuccess(res, data, "Feature flag updated");
  } catch (error) {
    next(error);
  }
}

export async function getConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminOpsService.getConfigStatus();
    return sendSuccess(res, data, "Config status fetched");
  } catch (error) {
    next(error);
  }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const kind = (req.params.kind as string) as "organizations" | "users" | "payments";
    const data = await adminOpsService.buildAdminCsv(kind);
    return sendSuccess(res, data, "CSV exported");
  } catch (error) {
    next(error);
  }
}

/* ---------- Contact inbox ---------- */

export async function listContactMessages(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.listContactMessages(
      {
        search: (req.query.search as string | undefined) ?? undefined,
        status: (req.query.status as string | undefined) ?? undefined,
      },
      {
        page: Number(req.query.page),
        pageSize: Number(req.query.pageSize),
      },
    );
    return sendSuccess(res, data, "Contact messages fetched");
  } catch (error) {
    next(error);
  }
}

export async function getContactMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.getContactMessage(req.params.id as string);
    return sendSuccess(res, data, "Contact message fetched");
  } catch (error) {
    next(error);
  }
}

export async function replyToContactMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.replyToContactMessage(
      ctx(req),
      req.params.id as string,
      req.body.reply,
    );
    return sendSuccess(res, data, "Reply saved");
  } catch (error) {
    next(error);
  }
}

export async function markContactRead(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.markContactRead(ctx(req), req.params.id as string);
    return sendSuccess(res, data, "Contact message marked as read");
  } catch (error) {
    next(error);
  }
}

export async function archiveContactMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminService.archiveContactMessage(
      ctx(req),
      req.params.id as string,
    );
    return sendSuccess(res, data, "Contact message archived");
  } catch (error) {
    next(error);
  }
}

export async function deleteContactMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await adminService.deleteContactMessage(ctx(req), req.params.id as string);
    return sendSuccess(res, null, "Contact message deleted");
  } catch (error) {
    next(error);
  }
}