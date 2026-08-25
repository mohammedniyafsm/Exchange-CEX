import { randomUUID } from "crypto";
import { prisma } from "@repo/db";
import { RedisManager } from "./redis/redis.js";
import { MatchEngine } from "./trade/engine.js";
import type { Side } from "./trade/orderbook.js";

export interface OrderMessage {
    userId: string,
    pair: string,
    side: Side,
    quantity: number,
    price: number
}

interface Result {
    clientId: string,
    message: {
        type: string
        data: OrderMessage
    }
}

async function main() {
    const engine = new MatchEngine();

    console.log("Engine consumer started, waiting for orders...");
    while (true) {
        const result = await RedisManager.getInstance().getNextOrder();
        if (!result) continue;
            const { clientId, message }: Result = JSON.parse(result.element);

            engine.process({ clientId, message });
    }
}
main();
