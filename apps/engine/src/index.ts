import { randomUUID } from "crypto";
import { prisma } from "@repo/db";
import { RedisManager } from "./redis/redis.js";
import { MatchEngine } from "./trade/engine.js";

interface Result {
    clientId: string,
    message: {
        type: string
        data: { userId: string, pair: string, side: string, quantity: number, price: number }
    }
}

async function main() {
    const engine = new MatchEngine();

    console.log("Engine consumer started, waiting for orders...");
    while (true) {
        const result = await RedisManager.getInstance().getNextOrder();
        if (!result) continue;
        engine.process({ clientId: result.key, message: JSON.parse(result.element) });
    }
}
main();
