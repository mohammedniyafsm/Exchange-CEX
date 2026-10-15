import { Router, type Request, type Response } from "express";
import type { Router as RouterType } from "express";
import { prisma } from "@repo/db";
import { authMiddleware, type AuthRequest } from "../../middleware/authMiddleware.js";
import { RedisManager } from "../../redis/redis.js";

const OrderRouter: RouterType = Router();

OrderRouter.use(authMiddleware);

OrderRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    res.json({
      success: true,
      orders: orders.map((order) => ({
        ...order,
        price: Number(order.price),
        quantity: Number(order.quantity),
        filled: Number(order.filled)
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve user orders", error);
    res.status(500).json({ success: false, message: "Unable to retrieve orders" });
  }
});

OrderRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { market, side, quantity, price } = req.body ?? {};
    if (
      typeof market !== "string" ||
      !/^[A-Z0-9]+_[A-Z0-9]+$/.test(market) ||
      !["BUY", "SELL"].includes(side) ||
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0 ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "A valid market, BUY/SELL side, positive quantity, and positive price are required"
      });
      return;
    }

    await RedisManager.getInstance().sendAndWait({
      type: "GET_BALANCES",
      data: { userId: req.userId }
    });
    const result = await RedisManager.getInstance().sendAndWait({
      type: "CREATE_ORDER",
      data: { userId: req.userId, market, side, quantity: Number(quantity), price: Number(price) }
    }) as { type?: string; payload?: { orderId?: string; executed?: number; fills?: unknown[]; message?: string } };

    if (result.type !== "ORDER_PLACED" || !result.payload?.orderId) {
      res.status(400).json({ success: false, message: result.payload?.message ?? "Order was rejected by the matching engine" });
      return;
    }

    res.status(201).json({ success: true, ...result.payload });
  } catch (error) {
    console.error("Failed to place order", error);
    res.status(500).json({
      success: false,
      message: "Unable to place order"
    });
  }
});

OrderRouter.delete("/:orderId", async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string") {
      res.status(400).json({ success: false, message: "A valid order ID is required" });
      return;
    }
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.userId! }
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    if (!["OPEN", "PARTIALLY_FILLED"].includes(order.status)) {
      res.status(409).json({ success: false, message: "Only open orders can be cancelled" });
      return;
    }

    const result = await RedisManager.getInstance().sendAndWait({
      type: "CANCEL_ORDER",
      data: { orderId: order.id, market: order.market }
    }) as { type?: string; payload?: { orderId?: string } };
    if (result.type !== "ORDER_CANCELLED" || result.payload?.orderId !== order.id) {
      res.status(400).json({ success: false, message: "Unable to cancel order" });
      return;
    }

    res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("Failed to cancel order", error);
    res.status(500).json({ success: false, message: "Unable to cancel order" });
  }
});


export default OrderRouter;
