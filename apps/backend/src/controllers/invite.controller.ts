import { Request, Response, NextFunction } from "express";
import * as orgService from "../services/org.service";
import { sendSuccess } from "../utils/ApiResponse";

export async function details(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { token } = req.params as { token: string };
    const result = await orgService.getInvitationDetails(token);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function respond(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await orgService.userRespondToInvitation(
      req.body.token,
      req.body.response,
    );
    return sendSuccess(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
}