import { NextFunction, Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service";
import { sendSuccess } from "../utils/ApiResponse";

export async function getDashboardOverview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };
    const data = await dashboardService.getDashboardOverview(identifier);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}