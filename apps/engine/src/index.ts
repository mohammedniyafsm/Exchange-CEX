import { randomUUID } from "crypto";
import { prisma } from "@repo/db";
import { BalanceManager } from "./engine.js";
import { orderBook, Side } from "./orderbook.js";
import { RedisManager } from "./redis/redis.js";

interface Result {
    clientId: string,
    message: {
        type: string
        data: { userId: string, pair: string, side: string, quantity: number, price: number }
    }
}

const bm = new BalanceManager();
export const book = new orderBook(bm);

bm.setOnAvailableChange(async (userId, asset, newAvailable) => {
    try {
        await prisma.balance.upsert({
            where: { userId_asset: { userId, asset } },
            update: { available: newAvailable },
            create: { userId, asset, available: newAvailable },
        });
    } catch (err) {
        console.error(`Failed to persist balance for ${userId}/${asset}:`, err);
    }
});


async function loadBalancesFromDB() {
    const allBalances = await prisma.balance.findMany();
    for (const row of allBalances) {
        bm.setBalance(row.userId, row.asset, row.available);
    }
    console.log(`Loaded ${allBalances.length} balances into memory`);
}

async function startConsumer() {
    console.log("Engine consumer started, waiting for orders...");

    while (true) {
        const result = await RedisManager.getInstance().getNextOrder();
        if (!result) continue;

        const { clientId, message } = JSON.parse(result.element);
        let payload: any = { success: false, message: "unknown type" };

        if (message.type === "CREATE_ORDER") {
            console.log(message)
            const { userId, side, price, quantity } = message.data;
            const trades = book.createOrder({
                id: randomUUID(),
                userId,
                side: side as Side,
                price,
                quantity,
            });
            payload = { success: true, trades };
        } else if (message.type === "DEPOSIT") {
            console.log(message);
            const { userId, asset, amount } = message.data;
            const deposit = 
        }
        await RedisManager.getInstance().sendResult(clientId, payload);

    }
}


async function main() {
    await loadBalancesFromDB();
    await startConsumer();
}

main();



