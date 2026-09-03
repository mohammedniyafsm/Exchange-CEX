import { readFileSync, writeFileSync } from "fs";
import { prisma } from "@repo/db";
import { RedisManager } from "../redis/redis.js";
import { orderBook, type Order, type Side } from "./orderbook.js";
import { randomUUID } from "crypto";
import type { OrderMessage } from "../index.js";


type UserBalance = {
    [key: string]: {
        available: number,
        locked: number,
    }
}

type OnAvailableChange = (userId: string, asset: string, newAvailable: number) => void;


export class MatchEngine {
    private balance: Map<string, UserBalance> = new Map();
    private orderBooks: any = [];
    private hasSnapshot = false;

    static async create() {
        const engine = new MatchEngine();
        if (!engine.hasSnapshot) {
            await engine.loadBalancesFromDb();
        }
        return engine;
    }

    constructor() {
        let snapshot = null;
        try {
            snapshot = readFileSync("./snapshot.json");
        } catch (error) {
            console.log("No snapshot found, starting fresh");
        }

        if (snapshot) {
            this.hasSnapshot = true;
            const snapShotJson = JSON.parse(snapshot.toString());
            this.orderBooks = snapShotJson.orderbooks.map((o: any) =>
                new orderBook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice)
            );
            this.balance = new Map(snapShotJson.balances);
        } else {
            this.orderBooks = [new orderBook("SOL", [], [], 0, 0)];
        }
    }

    private async loadBalancesFromDb() {
        const balances = await prisma.balance.findMany();

        for (const balance of balances) {
            const userBalance: UserBalance = this.balance.get(balance.userId) ?? {};
            userBalance[balance.asset] = {
                available: balance.available,
                locked: 0,
            };
            this.balance.set(balance.userId, userBalance);
        }
    }

    process({ clientId, message }: { clientId: string; message: any }) {
        switch (message.type) {
            case "CREATE_ORDER":
                try {
                    const { userId, price, quantity, side, market }: OrderMessage = message.data;
                    const { executed, fills, orderId } = this.createOrder({ userId, price, quantity, market, side });
                    console.log("Balances after order:", JSON.stringify(Array.from(this.balance.entries()), null, 2));
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executed,
                            fills
                        }
                    })
                } catch (error) {
                    console.log("Error in creating order in the engine", error);
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executed: 0,
                            remaining: 0
                        }
                    })
                }
                break;
        }
    }

    createOrder({ userId, price, quantity, market, side }: OrderMessage) {
        let orderbook = this.orderBooks.find((o: any) => o.getTicker() === market);
        let baseAsset = market.split("_")[0]!;
        let quoteAsset = market.split("_")[1]!;
        if (!orderbook) {
            throw new Error("No orderbook found");
        }
        this.checkAndUpdateFund(userId, baseAsset, quoteAsset, price, quantity, side);
        const Order: Order = {
            orderId: randomUUID(),
            quantity: Number(quantity),
            price: Number(price),
            side,
            userId,
            filled: 0,
        }
        const { fills, executed } = orderbook.createOrder(Order);
        this.updateFunds(userId, baseAsset, quoteAsset, side, fills, executed);

        this.pushBalancesToDb([
            userId,
            ...fills.map((fill: any) => fill.otherUserId),
        ]);

        for (const fill of fills) {
            const { marketOrderId, otherUserId, otherOrderSide, otherOrderPrice, otherOrderQuantity, otherOrderFilled } = fill;

            this.pushOrderToDb({
                orderId: marketOrderId,
                userId: otherUserId,
                market,
                side: otherOrderSide,
                price: otherOrderPrice,
                quantity: otherOrderQuantity,
                filled: otherOrderFilled,
            });
        }

        if (fills.length > 0) {
            this.pushOrderToDb({
                orderId: Order.orderId,
                userId,
                market,
                side,
                price: Number(price),
                quantity: Number(quantity),
                filled: executed,
            });
        }

        this.createDbTrades(fills, market, userId, Order.orderId, side);

        return { executed, fills, orderId: Order.orderId };
    }

    checkAndUpdateFund(userId: string, baseAsset: string, quoteAsset: string, price: number, quantity: number, side: Side) {
        let userBalance = this.balance.get(userId);
        if (!userBalance) {
            throw new Error("User balance not found");
        }

        if (side === "BUY") {
            const quoteBalance = userBalance[quoteAsset];
            if (!quoteBalance) {
                throw new Error(`Asset balance not found: ${quoteAsset}`);
            }
            if (quoteBalance.available < Number(price) * Number(quantity)) {
                throw new Error("Insufficient balance");
            }
            quoteBalance.available -= Number(quantity) * Number(price);
            quoteBalance.locked += Number(quantity) * Number(price);
        } else {
            const baseBalance = userBalance[baseAsset];
            if (!baseBalance) {
                throw new Error(`Asset balance not found: ${baseAsset}`);
            }
            if (baseBalance.available < Number(quantity)) {
                throw new Error("Insufficient funds");
            }
            baseBalance.available -= Number(quantity);
            baseBalance.locked += Number(quantity);
        }
    }

    updateFunds(userId: string, baseAsset: string, quoteAsset: string, side: string, fills: any[], executed: number) {
        for (const fill of fills) {
            const userBal = this.balance.get(userId);
            const otherBal = this.balance.get(fill.otherUserId);

            if (!userBal || !otherBal) {
                console.log(`ERROR: missing balance for ${!userBal ? userId : fill.otherUserId}`);
                continue;
            }
            if (!userBal[baseAsset] || !userBal[quoteAsset] || !otherBal[baseAsset] || !otherBal[quoteAsset]) {
                console.log("ERROR: missing asset entry in balance");
                continue;
            }

            if (side === "BUY") {
                otherBal[quoteAsset].available += fill.price * fill.quantity;
                userBal[baseAsset].available += fill.quantity;
                otherBal[baseAsset].locked -= fill.quantity;
                userBal[quoteAsset].locked -= fill.price * fill.quantity;
            } else if (side === "SELL") {
                otherBal[baseAsset].available += fill.quantity;
                userBal[quoteAsset].available += fill.quantity * fill.price;
                otherBal[quoteAsset].locked -= fill.price * fill.quantity;
                userBal[baseAsset].locked -= fill.quantity;
            }
        }
    }

    pushBalancesToDb(userIds: string[]) {
        const uniqueUserIds = new Set(userIds);

        for (const userId of uniqueUserIds) {
            const userBalance = this.balance.get(userId);
            if (!userBalance) continue;

            for (const [asset, balance] of Object.entries(userBalance)) {
                RedisManager.getInstance().pushMessage({
                    type: "BALANCE_UPDATED",
                    data: {
                        userId,
                        asset,
                        available: balance.available,
                        timestamp: Date.now(),
                    },
                });
            }
        }
    }

    saveSnapshot() {
        const snapshot = {
            orderbooks: this.orderBooks.map((o: any) => ({
                baseAsset: o.baseAsset,
                bids: o.bids,
                asks: o.asks,
                lastTradeId: o.lastTrade,
                currentPrice: o.currentPrice,
            })),
            balances: Array.from(this.balance.entries()),
        };
        writeFileSync("./snapshot.json", JSON.stringify(snapshot));
    }

    pushOrderToDb({
        orderId,
        userId,
        market,
        side,
        price,
        quantity,
        filled,
    }: {
        orderId: string;
        userId: string;
        market: string;
        side: Side;
        price: number;
        quantity: number;
        filled: number;
    }) {
        RedisManager.getInstance().pushMessage({
            type: "ORDER_ADDED",
            data: {
                orderId,
                userId,
                market,
                side,
                price,
                quantity,
                filled,
                status: filled === 0 ? "OPEN" : filled < quantity ? "PARTIALLY_FILLED" : "FILLED",
                timestamp: Date.now(),
            }
        });
    }

    createDbTrades(fills: any, market: string, userId: string, orderId: string, side: Side) {
        const isBuy = side === "BUY";
        fills.forEach((fill: any) => {
            RedisManager.getInstance().pushMessage({
                type: "TRADE_ADDED",
                data: {
                    tradeId: fill.tradeId,
                    market,
                    price: fill.price,
                    quantity: fill.quantity,
                    buyOrderId: isBuy ? orderId : fill.marketOrderId,
                    sellOrderId: isBuy ? fill.marketOrderId : orderId,
                    buyUserId: isBuy ? userId : fill.otherUserId,
                    sellUserId: isBuy ? fill.otherUserId : userId,
                    timestamp: Date.now(),
                }
            });
        });
    }

}

