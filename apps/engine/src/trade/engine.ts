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
    private orderBooks: any = [];
    private balance: Map<string, UserBalance> = new Map();
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
        console.log("user balances", balances)
        for (const balance of balances) {
            const userBalance: UserBalance = this.balance.get(balance.userId) ?? {};
            userBalance[balance.asset] = {
                available: balance.available,
                locked: balance.locked,
            };
            this.balance.set(balance.userId, userBalance);
        }
    }

    process({ clientId, message }: { clientId: string; message: any }) {
        switch (message.type) {

            case "CREATE_ORDER":
                try {
                    const { userId, price, quantity, side, market }: OrderMessage = message.data;
                    console.log("[ENGINE][CREATE_ORDER] Received", {
                        userId,
                        market,
                        side,
                        price: Number(price),
                        quantity: Number(quantity),
                    });

                    const { executed, fills, orderId } = this.createOrder({ userId, price, quantity, market, side });
                    console.log("[ENGINE][CREATE_ORDER] Result", {
                        orderId,
                        executed,
                        remaining: Number(quantity) - executed,
                        fillCount: fills.length,
                    });
                    console.log("\n");
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executed,
                            fills
                        }
                    })
                } catch (error) {
                    console.error("[ENGINE][CREATE_ORDER] Failed", error);
                    console.log("");
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

            case "CANCEL_ORDER":
                try {
                    const { orderId, market: cancelMarket } = message.data;
                    const cancelOrderbook = this.orderBooks.find(
                        (o: any) => o.getTicker() === cancelMarket,
                    );

                    if (!cancelOrderbook) {
                        console.log("from cancel order");
                        throw new Error("No orderbook found");
                    }

                    const order =
                        cancelOrderbook.asks.find((o: any) => o.orderId === orderId) ||
                        cancelOrderbook.bids.find((o: any) => o.orderId === orderId);

                    if (!order) {
                        console.log("from cancel order 2 ");
                        throw new Error("No order found");
                    }

                    const quoteAsset = cancelOrderbook.quoteAsset;
                    const baseAsset = cancelOrderbook.baseAsset;

                    if (order.side = "BUY") {
                        const price = cancelOrderbook.cancelBid(order);
                        const leftQuantity = (order.quantity - order.filled) * price;
                        this.ensureBalance(order.userId, quoteAsset);
                        this.balance.get(order.userId)![quoteAsset]!.available +=
                            leftQuantity;
                        this.balance.get(order.userId)![quoteAsset]!.locked -=
                            leftQuantity;
                    } else {
                        const price = cancelOrderbook.cancelAsk(order);
                        const leftQuantity = order.quantity - order.filled;
                        this.ensureBalance(order.userId, baseAsset);
                        this.balance.get(order.userId)![baseAsset]!.available +=
                            leftQuantity;
                        this.balance.get(order.userId)![baseAsset]!.locked -= leftQuantity;
                    }
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: { orderId, executedQty: 0, remainingQty: 0 },
                    });
                } catch (e) {
                    console.log("Error while cancelling order:", e);
                }
                break;

            case "GET_BALANCES":
                RedisManager.getInstance().sendResult(clientId, {
                    type: "BALANCES",
                    payload: this.getBalancesPayload(message.data.userId),
                });
                break;

            case "CLAIM_BALANCE":
                try {
                    this.claimBalance(
                        message.data.userId,
                        message.data.asset,
                        Number(message.data.amount),
                    );
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "BALANCES",
                        payload: this.getBalancesPayload(message.data.userId),
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "BALANCES",
                        payload: { balances: [] },
                    });
                }
                break;

            case "DEPOSIT":
                try {
                    const { userId, asset, amount } = message.data;
                    this.deposit(userId, asset, amount);
                    this.pushBalancesToDb([userId]);
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "DEPOSIT_COMPLETED",
                        payload: { userId, asset, amount: Number(amount) },
                    });
                } catch (error) {
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "DEPOSIT_FAILED",
                        payload: { message: error instanceof Error ? error.message : "Deposit failed" },
                    });
                }
                break;

            case "GET_OPEN_ORDERS":
                try {
                    const openOrderbook = this.orderBooks.find(
                        (o: any) => o.ticker() === message.data.market,
                    );
                    const openOrders =
                        openOrderbook?.getOpenOrders(message.data.userId) ?? [];
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrders.map((o: any) => ({
                            orderId: o.orderId,
                            executedQty: o.filled,
                            price: o.price.toString(),
                            quantity: o.quantity.toString(),
                            side: o.side,
                            userId: o.userId,
                        })),
                    });
                } catch (e) {
                    console.log(e);
                }
                break;

            case "WITHDRAW":
                try {
                    const { userId, asset, amount } = message.data;
                    this.withdraw(userId, asset, amount);
                    this.pushBalancesToDb([userId]);
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "WITHDRAW_COMPLETED",
                        payload: { userId, asset, amount: Number(amount) },
                    });
                } catch (error) {
                    RedisManager.getInstance().sendResult(clientId, {
                        type: "WITHDRAW_FAILED",
                        payload: { message: error instanceof Error ? error.message : "Withdrawal failed" },
                    });
                }
                break;
        }
    }

    createOrder({ userId, price, quantity, market, side }: OrderMessage) {
        const orderbook = this.orderBooks.find((o: any) => o.getTicker() === market);
        const baseAsset = market.split("_")[0]!;
        const quoteAsset = market.split("_")[1]!;
        if (!orderbook) {
            throw new Error("No orderbook found");
        }

        const orderId = randomUUID();
        const order: Order = {
            orderId,
            quantity: Number(quantity),
            price: Number(price),
            side,
            userId,
            filled: 0,
        };

        console.log("[ENGINE][CREATE_ORDER] Funds locked", {
            orderId,
            amount: side === "BUY" ? Number(price) * Number(quantity) : Number(quantity),
            asset: side === "BUY" ? quoteAsset : baseAsset,
        });
        this.checkAndUpdateFund(userId, baseAsset, quoteAsset, price, quantity, side);

        console.log(`[ENGINE][CREATE_ORDER] Matching ${side} ${orderId}`);
        const { fills, executed } = orderbook.createOrder(order);
        this.updateFunds(userId, baseAsset, quoteAsset, side, fills, executed);
        this.refundBuyPriceDifference(userId, quoteAsset, price, executed, fills);

        // Publish the latest balances for the incoming user and every matched counterparty.
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
                orderId: order.orderId,
                userId,
                market,
                side,
                price: Number(price),
                quantity: Number(quantity),
                filled: executed,
            });
        }

        this.createDbTrades(fills, market, userId, order.orderId, side);

        return { executed, fills, orderId: order.orderId };
    }


    // Validate available funds and move the order amount into locked balance.
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
            this.pushBalancesToDb([userId]);
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
            this.pushBalancesToDb([userId]);
        }
    }

    // Settle every fill by moving assets between the two matched users.
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

    // Refund Amount in case user get order less than he made buy request
    private refundBuyPriceDifference(
        userId: string,
        quoteAsset: string,
        orderPrice: number,
        executed: number,
        fills: any[],
    ) {
        if (executed <= 0 || fills.length === 0) return;

        const reservedForExecuted = Number(orderPrice) * executed;
        const actualExecutionCost = fills.reduce(
            (total, fill) => total + Number(fill.price) * Number(fill.quantity),
            0,
        );
        const refund = reservedForExecuted - actualExecutionCost;

        if (refund <= 0) return;

        const quoteBalance = this.balance.get(userId)?.[quoteAsset];
        if (!quoteBalance) {
            throw new Error(`Asset balance not found: ${quoteAsset}`);
        }

        quoteBalance.available += refund;
        quoteBalance.locked -= refund;

        console.log("[ENGINE][CREATE_ORDER] Refunded unused BUY price difference", {
            userId,
            asset: quoteAsset,
            refund,
        });
    }

    // Push Updated Balance to the Database (finding user balance pass to db_proccessor queue)
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
                        locked: balance.locked,
                        timestamp: Date.now(),
                    },
                });
            }
        }
    }

    // Update  orders  to DB 
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

    //create Trade match in DB
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

    deposit(userId: string, asset: string, amount: number) {
        this.validateWalletInput(userId, asset, amount);
        const userBalance = this.balance.get(userId) ?? {};
        const assetBalance = userBalance[asset] ?? { available: 0, locked: 0 };
        assetBalance.available += Number(amount);
        userBalance[asset] = assetBalance;
        this.balance.set(userId, userBalance);
    }

    withdraw(userId: string, asset: string, amount: number) {
        this.validateWalletInput(userId, asset, amount);
        const assetBalance = this.balance.get(userId)?.[asset];
        if (!assetBalance || assetBalance.available < Number(amount)) {
            throw new Error("Insufficient available balance");
        }
        assetBalance.available -= Number(amount);
    }

    private validateWalletInput(userId: string, asset: string, amount: number) {
        if (!userId || !asset || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            throw new Error("userId, asset, and a positive amount are required");
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

    claimBalance(userId: string, asset: string, amount: number) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Amount must be positive");
        }
        this.ensureBalance(userId, asset);
        this.balance.get(userId)![asset]!.available += amount;
    }

    private static TEST_USERS = new Set(["1", "2", "5"]);

    ensureBalance(userId: string, currency: string) {
        if (!this.balance.has(userId)) {
            this.balance.set(userId, {});
        }

        if (!this.balance.get(userId)![currency]) {
            const available = MatchEngine.TEST_USERS.has(userId) ? 100_000_000 : 0;
            this.balance.get(userId)![currency] = { available, locked: 0 };
        }
    }

    getBalancesPayload(userId: string) {
        const userBalance = this.balance.get(userId) ?? {};
        const balances = Object.entries(userBalance).map(([asset, b]) => ({
            asset,
            available: b.available.toString(),
            locked: b.locked.toString(),
        }));
        return { balances };
    }

}

