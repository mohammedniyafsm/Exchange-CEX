import { prisma } from "@repo/db";
import { Router, type Router as RouterType } from "express";

const MarketRouter: RouterType = Router();
const intervalBuckets: Record<string, string> = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "1h": "1 hour",
  "1d": "1 day"
};

MarketRouter.get("/:market/candles", async (req, res) => {
  const { market } = req.params;
  const interval = typeof req.query.interval === "string" ? req.query.interval : "1m";
  const limitValue = Number(req.query.limit ?? 240);
  const limit = Math.max(1, Math.min(500, Math.floor(limitValue)));

  if (!/^[A-Z0-9]+_[A-Z0-9]+$/.test(market) || !(interval in intervalBuckets) || !Number.isFinite(limitValue)) {
    res.status(400).json({ success: false, message: "Invalid market, interval, or limit" });
    return;
  }

  try {
    const bucket = intervalBuckets[interval];
    const candles = await prisma.$queryRaw<Array<{
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>>`
      SELECT
        date_bin(${bucket}::interval, "createdAt", TIMESTAMP '2000-01-01') AS time,
        (array_agg(price ORDER BY "createdAt" ASC))[1] AS open,
        MAX(price) AS high,
        MIN(price) AS low,
        (array_agg(price ORDER BY "createdAt" DESC))[1] AS close,
        SUM(quantity) AS volume
      FROM "Trade"
      WHERE market = ${market}
      GROUP BY date_bin(${bucket}::interval, "createdAt", TIMESTAMP '2000-01-01')
      ORDER BY time DESC
      LIMIT ${limit}
    `;

    res.json({
      success: true,
      candles: candles.reverse().map((candle) => ({
        t: candle.time.getTime(),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume)
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve market candles", error);
    res.status(500).json({ success: false, message: "Unable to retrieve market candles" });
  }
});

MarketRouter.get("/:market/trades", async (req, res) => {
  const { market } = req.params;
  const limitValue = Number(req.query.limit ?? 50);
  const limit = Math.max(1, Math.min(100, Math.floor(limitValue)));
  if (typeof market !== "string" || !/^[A-Z0-9]+_[A-Z0-9]+$/.test(market) || !Number.isFinite(limitValue)) {
    res.status(400).json({ success: false, message: "Invalid market or limit" });
    return;
  }

  try {
    const trades = await prisma.trade.findMany({
      where: { market },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { tradeId: true, price: true, quantity: true, createdAt: true }
    });
    res.json({
      success: true,
      trades: trades.map((trade) => ({
        id: trade.tradeId,
        market,
        price: Number(trade.price),
        quantity: Number(trade.quantity),
        t: trade.createdAt.getTime()
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve recent market trades", error);
    res.status(500).json({ success: false, message: "Unable to retrieve recent trades" });
  }
});

export default MarketRouter;
