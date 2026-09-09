import { prisma } from "@repo/db";
import { Router, type Response } from "express";
import { authMiddleware, type AuthRequest } from "../../middleware/authMiddleware.js";
import { RedisManager } from "../../redis/redis.js";


const WalletRouter: Router = Router();


WalletRouter.use(authMiddleware);

async function processWalletOperation(req: AuthRequest, res: Response, type: "DEPOSIT" | "WITHDRAW") {
    try {
        const { asset, amount } = req.body;
        const userId = req.userId;

        if (!userId || typeof asset !== "string" || !asset || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "asset and a positive amount are required",
            });
        }

        const response = await RedisManager.getInstance().sendAndWait({
            type,
            data: { userId, asset, amount }
        }) as { type: string; payload?: { message?: string } };

        if (response.type.endsWith("_FAILED")) {
            return res.status(400).json({ success: false, message: response.payload?.message ?? "Wallet operation failed" });
        }

        return res.status(200).json({ success: true, data: response.payload });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Wallet operation failed"
        })
    }
}

WalletRouter.post("/deposit", (req, res) => processWalletOperation(req, res, "DEPOSIT"));
WalletRouter.post("/withdraw", (req, res) => processWalletOperation(req, res, "WITHDRAW"));
WalletRouter.post("/wallet", (req, res) => processWalletOperation(req, res, "DEPOSIT"));

export default WalletRouter;