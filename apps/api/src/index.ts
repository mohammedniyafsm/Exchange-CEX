import "dotenv/config";
import express, { type Request, type Response } from "express";
import AuthRouter from "./router/auth/authRouter.js";
import DepthRouter from "./router/depth/depthRouter.js";
import MarketRouter from "./router/market/marketRouter.js";
import OrderRouter from "./router/order/orderRouter.js";
import WalletRouter from "./router/wallet/wallet.js";

if (!process.env.JWT_SECRET?.trim()) {
  throw new Error("JWT_SECRET is required. Configure it in apps/api/.env before starting the API.");
}

const PORT = process.env.PORT || 3001;
const app = express();
const allowedOrigins = new Set([
  process.env.WEB_ORIGIN || "http://localhost:5173",
  "http://localhost:5174"
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  try {
    res.send("API Working");
  } catch (error) {
    console.log("Test route failed");
    res.status(500).json({ message: "Internal server error in Test route" });
    return;
  }
})

app.use('/api/v1/auth', AuthRouter);
app.use('/api/v1/depth', DepthRouter);
app.use('/api/v1/market', MarketRouter);
app.use('/api/v1/orders', OrderRouter);
app.use('/api/v1/balance', WalletRouter);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
