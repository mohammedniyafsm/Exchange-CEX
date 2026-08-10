import express, { type Request, type Response } from "express";
import AuthRouter from "./router/auth/authRouter.js";


const app = express();

app.use(express.json());


app.get('/', (req: Request, res: Response) => {
    try {
        res.send("Test Working");
    } catch (error) {
        console.log("Test route failed");
        res.status(500).json({ message: "Internal server error in Test route" });
        return;
    }
})

app.use('/api/v1/auth',AuthRouter);