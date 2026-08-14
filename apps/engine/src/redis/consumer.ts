import { BalanceManager } from "../engine.js";
import { orderBook, Side } from "../orderbook.js";
import { RedisManager } from "./redis.js";
import { randomUUID } from "crypto";

interface Result {
    clientId: string,
    message: {
        type: string
        data: { userId: string, pair: string, side: string, quantity: number, price: number }
    }
}
const bm = new BalanceManager();
export const book = new orderBook(bm);

bm.setBalance("user1", "USDC", 50000);

async function startConsumer() {
    console.log("Engine consumer started, waiting for orders...");

    while (true) {
        const result = await RedisManager.getInstance().getNextOrder();
        if (!result) continue;

        const { clientId, message } = JSON.parse(result.element);
        let payload: any = { success: false, message: "unknown type" };

        if (message.type === "CREATE_ORDER") {
            const { userId, side, price, quantity } = message.data;
            const trades = book.createOrder({
                id: randomUUID(),
                userId,
                side: side as Side,
                price,
                quantity,
            });
            payload = { success: true, trades };
        }
        await RedisManager.getInstance().sendResult(clientId, payload);

    }
}

startConsumer();