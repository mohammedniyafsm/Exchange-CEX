import type { Request, Response, NextFunction } from "express";
import { prisma } from "@repo/db";
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
  void authenticate(req, res, next);
};

async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true }
    });
    if (!user || user.email !== decoded.email) {
      res.status(401).json({
        success: false,
        message: "User account no longer exists"
      });
      return;
    }

    req.userId = decoded.id;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    console.error("Authentication middleware failed", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
}
