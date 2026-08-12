import { BalanceManager } from "./engine.js";

export interface Order {
    id: string;
    quantity: number;
    price: number;
    side: Side;
    userId: string;
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
    balanceManager: BalanceManager;

    constructor(balanceManager: BalanceManager) {
        this.balanceManager = balanceManager;
    }

    createOrder(order: Order) {

        if (order.side == 'BUY') {
            let cost = order.price * order.quantity;
            let locked = this.balanceManager.lockBalance(order.userId, 'USDC', cost);
            if (!locked) {
                console.log('order rejected: insufficient USDC');
                return [];
            }
            return this.matchBuys(order);
        }

        if (order.side == 'SELL') {
            let locked = this.balanceManager.lockBalance(order.userId, 'SOL', order.quantity);
            if (!locked) {
                console.log('order rejected: insufficient SOL');
                return [];
            }
            return this.matchSells(order);
        }
    }

    matchBuys(order: Order) {

        let Trade: Trade[] = [];
        let remainingQuantity = order.quantity;

        this.asks.sort((a, b) => a.price - b.price);

        let i = 0;

        while (remainingQuantity > 0 && i < this.asks.length) {
            let ask = this.asks[i]!;

            if (order.price < ask?.price) {
                break;
            }

            let maxQunatity = Math.min(remainingQuantity, ask?.quantity);

            Trade.push({
                buyOrderId: order.id,
                sellOrderId: ask?.id,
                price: ask?.price,
                quantity: maxQunatity
            })


            remainingQuantity -= maxQunatity;
            ask.quantity -= maxQunatity;

            this.balanceManager.transferBalance(ask.userId, order.userId, "SOL", maxQunatity)
            this.balanceManager.transferBalance(order.userId, ask.userId, "USDC", ask.price * maxQunatity)

            this.balanceManager.unlockBalance(order.userId, "USDC", order.price * maxQunatity - ask.price * maxQunatity);

            if (ask?.quantity == 0) {
                this.asks.shift();
            } else {
                i++;
            }

        }

        if (remainingQuantity > 0) {
            this.bids.push({
                ...order,
                quantity: remainingQuantity,
            });
        }

        return Trade;
    }

    matchSells(order: Order) {

        this.bids.sort((a, b) => b.price - a.price);
        let remainingQuantity = order.quantity;
        let i = 0;
        let Trade: Trade[] = [];

        while (remainingQuantity > 0 && i < this.bids.length) {

            let bid = this.bids[i]!;

            if (order.price > bid.price) break;
            let maxQunatity = Math.min(bid?.quantity, remainingQuantity);

            Trade.push({
                buyOrderId: bid.id,
                sellOrderId: order.id,
                price: bid.price,
                quantity: maxQunatity,
            })

            remainingQuantity -= maxQunatity;
            bid.quantity -= maxQunatity;

            this.balanceManager.transferBalance(order.userId, bid.userId, "SOL", maxQunatity)
            this.balanceManager.transferBalance(bid.userId, order.userId, "USDC", bid.price * maxQunatity)


            if (bid.quantity == 0) {
                this.bids.shift();
            } else {
                i++;
            }

        }

        if (remainingQuantity > 0) {
            this.asks.push({
                ...order,
                quantity: remainingQuantity
            })
        }

        return Trade;
    }

    cancelOrder(order: Order): boolean {
        const { id: orderId, side: orderSide, userId } = order;

        if (orderSide === "BUY") {
            const bidIndex = this.bids.findIndex(o => o.id === orderId && o.userId === userId);
            if (bidIndex !== -1) {
                const resting = this.bids[bidIndex]!;
                this.balanceManager.unlockBalance(resting.userId, "USDC", resting.price * resting.quantity);
                this.bids.splice(bidIndex, 1);
                return true;
            }
        } else {
            const askIndex = this.asks.findIndex(o => o.id === orderId && o.userId === userId);
            if (askIndex !== -1) {
                const resting = this.asks[askIndex]!;
                this.balanceManager.unlockBalance(resting.userId, "SOL", resting.quantity);
                this.asks.splice(askIndex, 1);
                return true;
            }
        }

        return false;
    }

    getDepth(): { asks: { price: number; quantity: number }[]; bids: { price: number; quantity: number }[] } {
        const asksMap = new Map<number, number>();
        for (const order of this.asks) {
            asksMap.set(order.price, (asksMap.get(order.price) ?? 0) + order.quantity);
        }

        const bidsMap = new Map<number, number>();
        for (const order of this.bids) {
            bidsMap.set(order.price, (bidsMap.get(order.price) ?? 0) + order.quantity);
        }

        const asks = Array.from(asksMap.entries())
            .map(([price, quantity]) => ({ price, quantity }))
            .sort((a, b) => a.price - b.price);

        const bids = Array.from(bidsMap.entries())
            .map(([price, quantity]) => ({ price, quantity }))
            .sort((a, b) => b.price - a.price);

        return { asks, bids };
    }
}