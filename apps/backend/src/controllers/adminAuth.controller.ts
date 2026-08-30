import { Request, Response, NextFunction } from "express";
import * as adminAuthService from "../services/adminAuth.service";

export async function adminSignin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const response = await adminAuthService.loginAdmin(
      req.body.email,
      req.body.password,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function adminVerifyMfa(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const response = await adminAuthService.verifyMfaToken(
      req.body.email,
      req.body.otp,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}