import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    console.log("Registering user...");
    const response = await authService.createUser(req.body);
    return res.status(201).json(response);
  } catch (error: any) {
    console.error("Error registering user:", error);
    next(error);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await authService.verifyEmail(
      req.body.token,
      req.body.flag,
    );
    return res.status(200).json(response);
  } catch (error: any) {
    next(error);
  }
}

export async function setupMfa(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const response = await authService.setupMfa(req.body.email, req.body.otp);
    return res.status(200).json(response);
  } catch (error: any) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await authService.loginUser(
      req.body.email,
      req.body.password,
    );
    return res.status(200).json(response);
  } catch (error: any) {
    next(error);
  }
}

export async function verifyMfa(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const response = await authService.verifyMfaToken(
      req.body.email,
      req.body.otp,
    );
    return res.status(200).json(response);
  } catch (error: any) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const response = await authService.sendResetLink(req.body.email);
    return res.status(200).json(response);
  } catch (error: any) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const response = await authService.resetPassword({
      token: req.body.token,
      password: req.body.password,
      mfaOtp: req.body?.mfaOtp,
    });

    return res.status(200).json(response);
  } catch (error: any) {
    next(error);
  }
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // implement later
    return res.status(200).json({});
  } catch (error: any) {
    next(error);
  }
}
