import { prisma } from "@repo/db";

export async function DBQuery(data: any) {
    switch (data.type) {
        case "ORDER_ADDED": {
            try {
                await prisma.order.upsert({
                    where: { id: data.data.orderId },
                    update: {
                        filled: Number(data.data.filled),
                        status: data.data.status,
                    },
                    create: {
                        id: data.data.orderId,
                        userId: data.data.userId,
                        pair: data.data.market,          
                        side: data.data.side,
                        price: Number(data.data.price),
                        quantity: Number(data.data.quantity),
                        filled: Number(data.data.filled),
                        status: data.data.status,
                    },
                });
                console.log("order saved to db:", data.data.orderId);
            } catch (error) {
                console.error("Error while saving Order", error);
            }
            break;
        }

        case "TRADE_ADDED": {
            try {
                await prisma.trade.create({
                    data: {
                        tradeId: Number(data.data.tradeId),
                        market: data.data.market,
                        price: Number(data.data.price),
                        quantity: Number(data.data.quantity),
                        buyOrderId: data.data.buyOrderId,
                        sellOrderId: data.data.sellOrderId,
                        buyUserId: data.data.buyUserId,
                        sellUserId: data.data.sellUserId,
                        createdAt: new Date(data.data.timestamp),
                        // no "id" here — Trade.id uses @default(uuid()), Postgres generates it
                    }
                });
                console.log("trade saved to db:", data.data.tradeId);
            } catch (error) {
                console.error("Error while saving Trade", error);
            }
            break;
        }

        default:
            console.log("Unknown message type:", data.type);
            break;
    }
}