import { Request, Response, NextFunction } from "express";
import * as apiKeyService from "../services/apiKey.service";
import { sendSuccess } from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../middlewares/auth";

export async function listKeys(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };
    const keys = await apiKeyService.listApiKeys(identifier);
    return sendSuccess(res, keys);
  } catch (error) {
    next(error);
  }
}

export async function createKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier } = req.params as { identifier: string };
    const user = (req as AuthenticatedRequest).user!;

    const result = await apiKeyService.createApiKey(identifier, user.id, {
      name: req.body.name,
      scopes: req.body.scopes,
      expiresAt: req.body.expiresAt,
    });

    return sendSuccess(res, result, "API key created successfully", 201);
  } catch (error) {
    next(error);
  }
}

export async function rotateKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, keyId } = req.params as {
      identifier: string;
      keyId: string;
    };
    const user = (req as AuthenticatedRequest).user!;

    const result = await apiKeyService.rotateApiKey(
      identifier,
      keyId,
      user.id,
      req.body.otp,
    );

    return sendSuccess(res, result, "API key rotated successfully");
  } catch (error) {
    next(error);
  }
}

export async function revokeKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, keyId } = req.params as {
      identifier: string;
      keyId: string;
    };
    const user = (req as AuthenticatedRequest).user!;

    await apiKeyService.revokeApiKey(identifier, keyId, user.id, req.body.otp);

    return sendSuccess(res, null, "API key revoked successfully");
  } catch (error) {
    next(error);
  }
}

export async function enableMfa(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const response = await apiKeyService.enableMfaForUser(user.id);
    return sendSuccess(res, response, "MFA enabled successfully");
  } catch (error) {
    next(error);
  }
}

export async function completeMfaSetup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const response = await apiKeyService.completeMfaSetup(
      user.id,
      req.body.otp,
    );
    return sendSuccess(res, response, "MFA setup completed successfully");
  } catch (error) {
    next(error);
  }
}
