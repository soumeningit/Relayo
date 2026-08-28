import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import * as profileService from "../services/profile.service";
import { sendSuccess } from "../utils/ApiResponse";

type ProfileRequest = AuthenticatedRequest & {
  file?: { buffer: Buffer };
};

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const data = await profileService.getProfile(user.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const file = (req as ProfileRequest).file;
    const data = await profileService.updateProfile(user.id, req.body, file);
    return sendSuccess(res, data, "Profile updated");
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const data = await profileService.updateAddress(user.id, req.body);
    return sendSuccess(res, data, "Address updated");
  } catch (error) {
    next(error);
  }
}