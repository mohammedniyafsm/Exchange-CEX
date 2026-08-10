import { Router, type Request, type Response } from "express";
import type { Router as RouterType } from "express";
import { prisma } from "@repo/db";
import bcrypt from "bcrypt";

const AuthRouter: RouterType = Router();

AuthRouter.post('/signup', async (req: Request, res: Response) => {
    try {
        const { password, email } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: { email, password: hashedPassword }
        });

        res.status(200).json({
            message: "Account is Created Successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

AuthRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        res.status(200).json({
            message: "Logged in Successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

export default AuthRouter;