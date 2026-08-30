import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { sendSuccess } from "../utils/ApiResponse";
import * as adminDocsService from "../services/adminDocs.service";

function ctx(req: Request): adminDocsService.Context {
  const admin = (req as AuthenticatedRequest).admin!;
  return { admin: { id: admin.id, email: admin.email }, ip: req.ip };
}

export async function listDocs(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminDocsService.listAllDocs();
    return sendSuccess(res, data, "Documents fetched");
  } catch (error) {
    next(error);
  }
}

export async function createDoc(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminDocsService.createDoc(ctx(req), req.body);
    return sendSuccess(res, data, "Document created", 201);
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
    const data = await adminDocsService.getDocById(req.params.id as string);
    return sendSuccess(res, data, "Document fetched");
  } catch (error) {
    next(error);
  }
}

export async function updateDoc(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminDocsService.updateDoc(
      ctx(req),
      (req.params.id as string),
      req.body,
    );
    return sendSuccess(res, data, "Document updated");
  } catch (error) {
    next(error);
  }
}

export async function deleteDoc(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await adminDocsService.deleteDoc(ctx(req), (req.params.id as string));
    return sendSuccess(res, data, "Document deleted");
  } catch (error) {
    next(error);
  }
}