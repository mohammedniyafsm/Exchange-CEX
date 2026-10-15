import { prisma } from "@repo/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be configured");
  }
  return secret;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
  };
}

export const authService = {
  
  async signup(email: string, password: string): Promise<AuthResponse> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return {
          success: false,
          message: "Email already registered"
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword
        }
      });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      return {
        success: true,
        message: "Account created successfully",
        token,
        user: {
          id: user.id,
          email: user.email
        }
      };
    } catch (error) {
      console.error("Signup error:", error);
      return {
        success: false,
        message: "Unable to create account"
      };
    }
  },

  async signin(email: string, password: string): Promise<AuthResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      return {
        success: true,
        message: "Signed in successfully",
        token,
        user: {
          id: user.id,
          email: user.email
        }
      };
    } catch (error) {
      console.error("Signin error:", error);
      return {
        success: false,
        message: "Unable to sign in"
      };
    }
  },

  verifyToken(token: string): { id: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (typeof decoded === "string" || typeof decoded.id !== "string" || typeof decoded.email !== "string") {
        return null;
      }
      return { id: decoded.id, email: decoded.email };
    } catch {
      return null;
    }
  }
};
