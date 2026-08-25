import { Router, type Request, type Response } from "express";
import type { Router as RouterType } from "express";
import { authMiddleware, type AuthRequest } from "../../middleware/authMiddleware.js";
import { RedisManager } from "../../redis/redis.js";

const OrderRouter: RouterType = Router();

// OrderRouter.use(authMiddleware);

OrderRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { pair, side, quantity, price,userId } = req.body;
    // const userId = req.userId!;

    if (!pair || !side || !quantity || !price) {
      res.status(400).json({
        success: false,
        message: "pair, side, quantity, and price are required"
      });
      return;
    }

    const result: any = await RedisManager.getInstance().sendAndWait({
      type: "CREATE_ORDER",
      data: { userId, pair, side, quantity, price }
    })

    if (result.type === "ORDER_PLACED") {
      console.log(result)
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


OrderRouter.delete("/", async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, market } = req.body;
    const userId = req.userId!;

    const result: any = await RedisManager.getInstance().sendAndWait({
      type: "DELETE_ORDER",
      data: { userId, orderId, market }
    })
    console.log(result)
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


OrderRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, market } = req.body;
    const userId = req.userId!;

    const result: any = await RedisManager.getInstance().sendAndWait({
      type: "GET_OPEN_ORDERS",
      data: { userId, market }
    })
    console.log(result)
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default OrderRouter;
