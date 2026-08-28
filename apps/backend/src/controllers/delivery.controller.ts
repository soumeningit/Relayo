import { NextFunction, Request, Response } from "express";
import * as deliveryService from "../services/delivery.service";
import { sendSuccess } from "../utils/ApiResponse";

export async function listDeliveries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { identifier } = req.params as { identifier: string };

    const { status, destinationId, page, pageSize } = req.query;

    const deliveries = await deliveryService.listDeliveries(
      identifier,
      {
        status: status as string | undefined,
        destinationId: destinationId as string | undefined,
      },
      {
        page: page as number | undefined,
        pageSize: pageSize as number | undefined,
      },
    );

    sendSuccess(res, deliveries);
  } catch (error) {
    next(error);
  }
}

export async function replayDelivery(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { identifier, deliveryId } = req.params as {
      identifier: string;
      deliveryId: string;
    };

    const delivery = await deliveryService.replayDelivery(
      identifier,
      deliveryId,
    );

    sendSuccess(res, delivery, "Delivery queued for replay", 200);
  } catch (error) {
    next(error);
  }
}
