import { Router, type Response } from "express";
import type { Router as RouterType } from "express";
import { RedisManager } from "../../redis/redis.js";

const DepthRouter: RouterType = Router();

type DepthResponse = {
  type: string;
  payload?: {
    market: string;
    bids?: { price: number; quantity: number }[];
    asks?: { price: number; quantity: number }[];
  };
};

DepthRouter.get("/:market", async (req, res: Response) => {
  const { market } = req.params;
  if (!/^[A-Z0-9]+_[A-Z0-9]+$/.test(market)) {
    res.status(400).json({ message: "market must use BASE_QUOTE format" });
    return;
  }

  try {
    const result = await RedisManager.getInstance().sendAndWait({
      type: "GET_DEPTH",
      data: { market },
    }) as DepthResponse;

    if (result.type === "DEPTH_NOT_FOUND") {
      res.status(404).json({ message: `Unknown market: ${market}` });
      return;
    }

    if (result.type !== "DEPTH" || !result.payload) {
      res.status(502).json({ message: "Unable to retrieve market depth" });
      return;
    }

    res.json(result.payload);
  } catch (error) {
    console.error("Failed to retrieve market depth", error);
    res.status(503).json({ message: "Market depth service unavailable" });
  }
});

export default DepthRouter;
