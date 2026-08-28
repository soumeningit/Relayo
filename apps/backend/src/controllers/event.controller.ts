import { NextFunction, Request, Response } from "express";
import * as eventService from "../services/event.service";
import { sendSuccess } from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../middlewares/webhook";

export async function acceptEvent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const org = (req as AuthenticatedRequest)?.org;

    if (!org) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const response = await eventService.acceptEvent({
      organizationId: org.id,
      destinationId: req.body.destinationId || null,
      eventType: req.body.eventType,
      payload: req.body.payload,
    });

    return sendSuccess(res, response, "Event accepted successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function getEvents(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const identifier = req.params.identifier as string;

    const { page, pageSize, search } = req.query as {
      page?: number;
      pageSize?: number;
      search?: string;
    };

    const events = await eventService.getEvents(identifier, {
      page,
      pageSize,
      search,
    });

    return sendSuccess(res, events, "Events retrieved successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function getEventDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const identifier = req.params.identifier as string;
    const eventId = req.params.eventId as string;

    const events = await eventService.getEventDetails(identifier, eventId);

    return sendSuccess(res, events, "Events retrieved successfully", 200);
  } catch (error) {
    next(error);
  }
}
