import { prisma } from "@repo/db";
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { RedisManager } from "../../redis/redis.js";


const WalletRouter: Router = Router();


WalletRouter.use(authMiddleware);

WalletRouter.post("/wallet", async (req, res) => {
    try {
        const { userId, asset, amount } = req.body

        if (!userId || !asset || !amount) {
            return res.json({
                success: false,
                message: "Missing required fields",
            });
        }

        const response = await RedisManager.getInstance().sendAndWait({
            type: "DEPOSIT",
            data: { userId, asset, amount }
        })

        return res.json({
            success: true,
            message: "Balance created successfully",
            data: response
        })
    } catch (error) {
        console.log(error)
        return res.json({
            success: false,
            message: "Error creating balance"
        })
    }
})

export default WalletRouter;