import { prisma } from "@repo/db";
import { Router, type Response } from "express";
import { authMiddleware, type AuthRequest } from "../../middleware/authMiddleware.js";
import { RedisManager } from "../../redis/redis.js";


const WalletRouter: Router = Router();

WalletRouter.use(authMiddleware);

WalletRouter.get("/", async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const result = await RedisManager.getInstance().sendAndWait({
            type: "GET_BALANCES",
            data: { userId }
        }) as { type?: string; payload?: { balances?: { asset: string; available: string; locked: string }[] } };

        if (result.type !== "BALANCES" || !result.payload?.balances) {
            return res.status(502).json({ success: false, message: "Unable to retrieve balances" });
        }

        return res.json({ success: true, balances: result.payload.balances });
    } catch (error) {
        console.error("Failed to retrieve user balances", error);
        return res.status(503).json({ success: false, message: "Balance service unavailable" });
    }
});

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

export default WalletRouter;