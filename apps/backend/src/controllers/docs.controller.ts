import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/ApiResponse";
import * as service from "../services/docs.service";

export async function listDocs(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.listPublishedDocs();
    return sendSuccess(res, data, "Documents fetched");
  } catch (error) {
    next(error);
  }
}

export async function getDoc(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getPublishedDocBySlug(req.params.slug as string);
    return sendSuccess(res, data, "Document fetched");
  } catch (error) {
    next(error);
  }
}