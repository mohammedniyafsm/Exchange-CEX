import { prisma } from "@repo/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_change_in_production";

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
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return {
          success: false,
          message: "Email already registered"
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
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
      return {
        success: false,
        message: "Error creating account"
      };
    }
  },

  async signin(email: string, password: string): Promise<AuthResponse> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      // Compare password
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
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
      return {
        success: false,
        message: "Error signing in"
      };
    }
  },

  verifyToken(token: string): { id: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }
};
