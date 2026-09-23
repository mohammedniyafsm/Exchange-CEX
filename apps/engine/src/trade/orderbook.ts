export interface Order {
    orderId: string,
    quantity: number;
    price: number;
    side: Side;
    userId: string;
    filled: number,
}

export enum Side {
    BUY = "BUY",
    SELL = "SELL"
}

export interface Trade {
    buyOrderId: string;
    sellOrderId: string;
    price: number;
    quantity: number;
}

export class orderBook {
    asks: Order[] = [];
    bids: Order[] = [];
    baseAsset: string; // in SOL_USDC , SOL is the base
    quoteAsset: string = "USDC";  // USDC in SOL_USDC 
    lastTrade: number | 0;
    currentPrice: number | 0;

    constructor(baseAsset: string, asks: Order[], bids: Order[], lastTrade: number, currentPrice: number) {
        this.baseAsset = baseAsset;
        this.asks = asks;
        this.bids = bids;
        this.lastTrade = lastTrade;
        this.currentPrice = currentPrice;
    }

    getTicker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    private logBookSide(label: string, orders: Order[]) {
        console.log(`  ${label} (top 5):`, orders.slice(0, 5).map((order) => ({
            orderId: order.orderId,
            price: order.price,
            quantity: order.quantity,
            filled: order.filled,
            remaining: order.quantity - order.filled,
        })));
    }

    private logMatchingSide(order: Order, stage: "before" | "after") {
        const isBuy = order.side === "BUY";
        const label = isBuy ? "ASKS (sell orders)" : "BIDS (buy orders)";
        const orders = isBuy ? this.asks : this.bids;

        console.log(`[ORDERBOOK][${order.orderId}] ${stage} match: ${label}`);
        this.logBookSide(label, orders);
        console.log("");
    }

    createOrder(order: Order) {
        try {
            if (order.side === "BUY") {
                this.logMatchingSide(order, "before");
                const { fills, executed } = this.matchBuys(order);
                order.filled = executed;
                this.logMatchingSide(order, "after");

                if (order.quantity === executed) {
                    console.log("[ORDERBOOK][CREATE_ORDER] Fully matched", {
                        orderId: order.orderId,
                        executed,
                        fillCount: fills.length,
                    });
                    return ({
                        fills,
                        executed
                    })
                }

                console.log("[ORDERBOOK][CREATE_ORDER] Resting on bids", {
                    orderId: order.orderId,
                    executed,
                    remaining: order.quantity - executed,
                });
                this.bids.push(order);
                this.bids.sort((a, b) => b.price - a.price);
                return ({
                    fills,
                    executed,
                })
            }
            else if (order.side === "SELL") {
                this.logMatchingSide(order, "before");
                const { fills, executed } = this.matchSells(order);
                order.filled = executed;
                this.logMatchingSide(order, "after");

                if (order.quantity === executed) {
                    console.log("[ORDERBOOK][CREATE_ORDER] Fully matched", {
                        orderId: order.orderId,
                        executed,
                        fillCount: fills.length,
                    });
                    return ({
                        fills,
                        executed
                    })
                }

                console.log("[ORDERBOOK][CREATE_ORDER] Resting on asks", {
                    orderId: order.orderId,
                    executed,
                    remaining: order.quantity - executed,
                });
                this.asks.push(order);
                this.asks.sort((a, b) => a.price - b.price);
                return ({
                    fills,
                    executed,
                })

            }
        } catch (error) {
            console.error("[ORDERBOOK][CREATE_ORDER] Failed", error);
            console.log("");
            return;
        }
    }

    matchBuys(order: Order) {
        let { userId, quantity, price, side, filled, orderId } = order;
        let executed = 0;
        let fills = [];
        let touchedCount = 0;
        let remainingToExecute = quantity - filled;

        for (let i = 0; i < this.asks.length; i++) {
            let ask = this.asks[i]!;

            if (ask.price > price) {
                break;
            }

            const remainingAskQuantity = ask.quantity - ask.filled;
            if (executed < remainingToExecute) {
                let filledQty = Math.min(remainingToExecute - executed, remainingAskQuantity);
                executed += filledQty;
                ask.filled += filledQty;
                touchedCount++;
                fills.push({
                    price: ask.price,
                    quantity: filledQty,
                    tradeId: this.lastTrade++,
                    otherUserId: ask.userId,
                    marketOrderId: ask.orderId,
                    otherOrderQuantity: ask.quantity,
                    otherOrderFilled: ask.filled,
                    otherOrderPrice: ask.price,
                    otherOrderSide: ask.side,
                })
            }
        }

        for (let i = 0; i < touchedCount; i++) {
            let ask = this.asks[i]!;
            if (ask.filled === ask.quantity) {
                this.asks.splice(i, 1);
                i--;
                touchedCount--;
            }
        }

        return { fills, executed }
    }

    matchSells(order: Order) {
        let { userId, quantity, price, side, filled, orderId } = order;
        let executed = 0;
        let fills = [];
        let touchedCount = 0;
        let remainingToExecute = quantity - filled;

        for (let i = 0; i < this.bids.length; i++) {
            let bid = this.bids[i]!;
            if (price > bid?.price) {
                break;
            }

            const remainingBidQuantity = bid.quantity - bid.filled;
            if (executed < remainingToExecute) {
                let filledQty = Math.min(remainingToExecute - executed, remainingBidQuantity);
                executed += filledQty;
                bid.filled += filledQty;
                touchedCount++;

                fills.push({
                    price: bid?.price,
                    quantity: filledQty,
                    tradeId: this.lastTrade++,
                    otherUserId: bid?.userId,
                    marketOrderId: bid?.orderId,
                    otherOrderQuantity: bid?.quantity,
                    otherOrderFilled: bid?.filled,
                    otherOrderPrice: bid?.price,
                    otherOrderSide: bid?.side,
                })

            }
        }

        for (let i = 0; i < touchedCount; i++) {
            let bid = this.bids[i];
            if (bid?.filled === bid?.quantity) {
                this.bids.splice(i, 1);
                i--;
                touchedCount--;
            }
        }

        return {
            fills,
            executed,
        }
    }

    cancelBid(order: Order) {
        const index = this.bids.findIndex((b) => b.orderId == order.orderId);
        if (index != -1) {
            const price = this.bids[index]!.price;
            this.bids.splice(index, 1);
            return price;
        }
    }

    cancelAsk(order: Order) {
        const index = this.asks.findIndex((a) => a.orderId == order.orderId);
        if (index != -1) {
            const price = this.bids[index]!.price;
            this.asks.splice(index, 1);
            return price;
        }
    }

    getOpenOrders(userId: string): Order[] {
        return [
            ...this.asks.filter((x) => x.userId === userId),
            ...this.bids.filter((x) => x.userId === userId),
        ];
    }

}