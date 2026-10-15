import { Router, type Request, type Response } from "express";
import type { Router as RouterType } from "express";
import { authMiddleware, type AuthRequest } from "../../middleware/authMiddleware.js";
import { authService } from "./authService.js";

const AuthRouter: RouterType = Router();

AuthRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 8) {
      res.status(400).json({
        success: false,
        message: "A valid email and password with at least 8 characters are required"
      });
      return;
    }

    const result = await authService.signup(email, password);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Signup request failed", error);
    res.status(500).json({
      success: false,
      message: "Unable to create account"
    });
  }
});

AuthRouter.post("/signin", async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;

    if (!email || typeof password !== "string" || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
      return;
    }

    const result = await authService.signin(email, password);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error("Signin request failed", error);
    res.status(500).json({
      success: false,
      message: "Unable to sign in"
    });
  }
});

AuthRouter.get("/me", authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    user: { id: req.userId, email: req.userEmail }
  });
});

export default AuthRouter;