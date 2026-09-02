import express, { type Request, type Response } from "express";
import AuthRouter from "./router/auth/authRouter.js";
import OrderRouter from "./router/order/orderRouter.js";
import WalletRouter from "./router/wallet/wallet.js";

const PORT = process.env.PORT || 3001;
const app = express();
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


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
