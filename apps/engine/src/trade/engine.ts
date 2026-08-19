import { RedisManager } from "../redis/redis.js";
import type { Side } from "./orderbook.js";
import { randomUUID } from "crypto";


type UserBalance = {
    [key: string]: {
        available: number,
        locked: number,
    }
}

const BASE_CURRENCY = "USDC"
type OnAvailableChange = (userId: string, asset: string, newAvailable: number) => void;


export class MatchEngine {
    private balance: Map<string, UserBalance> = new Map();
    private orderBooks: any = [];

    constructor() {
        
    }

    process({ clientId, message }: { clientId: string; message: any }) {
        switch (message.type) {
            case "CREATE_ORDER":
                try {
                    const { userId, asset, price, quantity, market, side } = message.data;
                    const { executed, fills, orderId } = this.createOrder(userId, asset, price, quantity, market, side);
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

    createOrder(userId: string, price: string, quantity: string, market: string, side: "BUY" | "SELL") {
        let orderbook = this.orderBooks.find((o: any) => o.getTicker() === market);
        let baseAsset = market.split("_")[0];
        let quoteAsset = market.split("_")[1];
        if (!orderbook) {
            throw new Error("No orderbook found");
        }
        this.checkAndUpdateFund(userId, baseAsset, quoteAsset, price, quantity, side);
        const Order = {
            userId,
            quantity: Number(quantity),
            price: Number(price),
            side,
            filled: 0,
            orderId: randomUUID(),
        }
        const { fills, executed } = orderbook.createOrder(Order);
        this.updateFunds(userId, baseAsset, quoteAsset, side, fills, executed);
        return { executed, fills, orderId: Order.orderId };
    }

    checkAndUpdateFund(userId: string, baseAsset: string, quoteAsset: string, price: string, quantity: string, side: Side) {
        let userBalance = this.balance.get(userId);
        if (!userBalance) {
            throw new Error("User balance not found");
        }

        if (side === "BUY") {
            if ((userBalance[quoteAsset].available | 0) < Number(price) * Number(quantity)) {
                throw new Error("Insufficient balance");
            }
            userBalance[quoteAsset]!.available -= Number(quantity) * Number(price);
            userBalance[quoteAsset]!.locked += Number(quantity) * Number(price);
        } else {

            if ((userBalance[baseAsset]?.available || 0) < Number(quantity)) {
                throw new Error("Insufficient funds");
            }
            userBalance[baseAsset]!.available -= Number(quantity);
            userBalance[baseAsset]!.locked += Number(quantity);
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


}

