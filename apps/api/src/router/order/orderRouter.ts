import { Router, type Request, type Response } from "express";
import type { Router as RouterType } from "express";
import { authMiddleware, type AuthRequest } from "../../middleware/authMiddleware.js";
import { orderService } from "./orderService.js";

const OrderRouter: RouterType = Router();

OrderRouter.use(authMiddleware);

OrderRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { pair, side, quantity, price } = req.body;
    const userId = req.userId!;

    if (!pair || !side || !quantity || !price) {
      res.status(400).json({
        success: false,
        message: "pair, side, quantity, and price are required"
      });
      return;
    }

    const result = await orderService.createOrder(userId, pair, side, quantity, price);

    if (result.success) {
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

// Get all user orders
OrderRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const result = await orderService.getOrders(userId);

    if (result.success) {
      res.status(200).json(result);
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

// Get order by ID
OrderRouter.get("/:orderId", async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params as { orderId: string };
    const userId = req.userId!;

    const result = await orderService.getOrderById(orderId, userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(result.error === "NOT_FOUND" ? 404 : 403).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Cancel order
OrderRouter.post("/:orderId/cancel", async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params as { orderId: string };
    const userId = req.userId!;

    const result = await orderService.cancelOrder(orderId, userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(result.error === "NOT_FOUND" ? 404 : 400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Update order status (admin/system use)
OrderRouter.patch("/:orderId/status", async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params as { orderId: string };
    const { status } = req.body as { status: string };
    const userId = req.userId!;

    if (!status) {
      res.status(400).json({
        success: false,
        message: "status is required"
      });
      return;
    }

    const result = await orderService.updateOrderStatus(orderId, status, userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(result.error === "NOT_FOUND" ? 404 : 400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default OrderRouter;
