import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import * as destinationService from "../services/destination.service";
import { sendSuccess } from "../utils/ApiResponse";

export async function listDestinations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };
    const data = await destinationService.listDestinations(identifier);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getDestination(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, destinationId } = req.params as {
      identifier: string;
      destinationId: string;
    };
    const data = await destinationService.getDestination(
      identifier,
      destinationId,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function createDestination(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };
    const user = (req as AuthenticatedRequest).user!;

    const result = await destinationService.createDestination(
      identifier,
      user.id,
      { name: req.body.name, url: req.body.url },
    );

    return sendSuccess(res, result, "Destination created successfully", 201);
  } catch (error) {
    next(error);
  }
}

export async function pauseDestination(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, destinationId } = req.params as {
      identifier: string;
      destinationId: string;
    };
    const data = await destinationService.pauseDestination(
      identifier,
      destinationId,
    );
    return sendSuccess(res, data, "Destination paused");
  } catch (error) {
    next(error);
  }
}

export async function resumeDestination(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, destinationId } = req.params as {
      identifier: string;
      destinationId: string;
    };
    const data = await destinationService.resumeDestination(
      identifier,
      destinationId,
    );
    return sendSuccess(res, data, "Destination resumed");
  } catch (error) {
    next(error);
  }
}

export async function rotateSecret(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, destinationId } = req.params as {
      identifier: string;
      destinationId: string;
    };
    const data = await destinationService.rotateDestinationSecret(
      identifier,
      destinationId,
    );
    return sendSuccess(res, data, "Signing secret rotated");
  } catch (error) {
    next(error);
  }
}

export async function deleteDestination(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, destinationId } = req.params as {
      identifier: string;
      destinationId: string;
    };
    await destinationService.deleteDestination(identifier, destinationId);
    return sendSuccess(res, null, "Destination deleted");
  } catch (error) {
    next(error);
  }
}

export async function getDestinationDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    console.log("getDestinationDetails called");
    const { identifier, destinationId } = req.params as {
      identifier: string;
      destinationId: string;
    };

    console.log("Parameters received:", { identifier, destinationId });
    const data = await destinationService.getDestinationDetails(
      identifier,
      destinationId,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
