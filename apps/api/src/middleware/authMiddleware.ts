import type { Request, Response, NextFunction } from "express";
import { authService } from "../router/auth/authService.js";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Missing or invalid authorization header"
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
      return;
    }

    req.userId = decoded.id;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};
