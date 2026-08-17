import express, { type Request, type Response } from "express";
import AuthRouter from "./router/auth/authRouter.js";
import OrderRouter from "./router/order/orderRouter.js";
import WalletRouter from "./router/wallet/wallet.js";

const app = express();

app.use((req, res, next) => {
  const startedAt = Date.now();
  const method = req.method;
  const url = req.originalUrl;

  console.log(`[${new Date().toISOString()}] ${method} ${url} started`);

  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    console.log(`[${new Date().toISOString()}] ${method} ${url} -> ${res.statusCode} (${duration}ms)`);
  });

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
app.use('/api/v1/orders', OrderRouter);
app.use('/api/v1/balance', WalletRouter);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Error: Port ${PORT} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});