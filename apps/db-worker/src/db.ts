import { prisma } from "@repo/db";

export async function DBQuery(data: any) {
    switch (data.type) {
        case "TRADE_ADDED":
            try {
                await prisma.trade.create({
                    data: {
                        tradeId: Number(data.data.tradeId),
                        pair: data.data.market,
                        price: Number(data.data.price),
                        quantity: Number(data.data.quantity),
                        buyOrderId: data.data.buyOrderId,
                        sellOrderId: data.data.sellOrderId,
                        buyUserId: data.data.buyUserId,
                        sellUserId: data.data.sellUserId,
                        createdAt: new Date(data.data.timestamp),
                    }
                });
                console.log("trade saved to db");
            } catch (error) {
                console.log("Error while saving Trade", error);   // also log the actual error, not just a message
            }
            break;   // add this — see below
    }
}