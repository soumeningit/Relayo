import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthenticatedRequest extends Request {
  user?: {
    /** Public user id from the token (users.user_id) — resolve numeric PK only where a DB write needs it */
    id: string;
    email: string;
  };
}

interface AccessTokenPayload {
  id: string;
  email: string;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Access denied. No authentication token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as
      | (AccessTokenPayload & { exp?: number })
      | string;

    if (typeof decoded === "string" || !decoded.id || !decoded.email) {
      res
        .status(401)
        .json({ error: "Invalid or expired authorization token." });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
    };

    return next();
  } catch {
    res.status(401).json({ error: "Invalid or expired authorization token." });
  }
}
