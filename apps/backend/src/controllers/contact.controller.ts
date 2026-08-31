import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/ApiResponse";
import * as contactService from "../services/contact.service";

export async function submitContact(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await contactService.submitContact(req.body);
    return sendSuccess(res, data, "Message received", 201);
  } catch (error) {
    next(error);
  }
}
