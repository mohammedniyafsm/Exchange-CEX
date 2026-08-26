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
                        price: Number(data.data.price),
                        quantity: Number(data.data.quantity),
                    },
                    create: {
                        id: data.data.orderId,
                        userId: data.data.userId,
                        pair: data.data.pair,
                        side: data.data.side,
                        price: Number(data.data.price),
                        quantity: Number(data.data.quantity),
                        filled: Number(data.data.filled),
                        status: data.data.status,
                    },
                });
                console.log("order saved to db");
            } catch (error) {
                console.error("Error while saving Order", error);
            }
            break;
        }

        case "TRADE_ADDED": {
            try {
                await prisma.trade.create({
                    data: {
                        market: data.data.market,
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
                console.error("Error while saving Trade", error);
            }
            break;
        }

        default:
            break;
    }
}