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

    createOrder(order: Order) {
        try {
            if (order.side == 'BUY') {
                const { fills, executed } = this.matchBuys(order);
                order.filled = executed;

                if (order.quantity === executed) {
                    return ({
                        fills,
                        executed
                    })
                }

                this.bids.push(order);
                this.bids.sort((a, b) => b.price - a.price);
                return ({
                    fills,
                    executed,
                })
            }
            else if (order.side == 'SELL') {
                const { fills, executed } = this.matchSells(order);
                order.filled = executed;

                if (order.quantity === executed) {
                    return ({
                        fills,
                        executed
                    })
                }

                this.asks.push(order);
                this.asks.sort((a, b) => a.price - b.price);
                return ({
                    fills,
                    executed,
                })

            }
        } catch (error) {
            console.log("Error in creating order");
            return;
        }
    }

    matchBuys(order: Order) {
        let { userId, quantity, price, side, filled, orderId } = order;
        let executed = 0;
        let fills = [];
        let touchedCount = 0; // track how many asks we actually touched

        for (let i = 0; i < this.asks.length; i++) {
            let ask = this.asks[i]!;

            if (ask?.price! > price) {
                break;
            }

            if (executed < quantity) {
                let filledQty = Math.min((quantity - executed), ask?.quantity!);
                executed += filledQty;
                ask.filled += filledQty;
                touchedCount++;
                fills.push({
                    price: ask?.price,
                    quantity: filledQty,
                    tradeId: this.lastTrade++,
                    otherUserId: ask?.userId,
                    marketOrderId: ask?.orderId,
                })
            }
        }

        for (let i = 0; i < touchedCount; i++) {
            let ask = this.asks[i];
            if (ask?.filled === ask?.quantity) {
                this.asks.splice(i, 1);
                i--;
                touchedCount--;
            }
        }

        return {
            fills,
            executed,
        }
    }

    matchSells(order: Order) {
        let { userId, quantity, price, side, filled, orderId } = order;
        let executed = 0;
        let fills = [];
        let touchedCount = 0;

        for (let i = 0; i < this.bids.length; i++) {
            let bid = this.bids[i]!;
            if (price > bid?.price) {
                break;
            }

            if (executed < quantity) {
                let filledQty = Math.min((quantity - executed), bid?.quantity!);
                executed += filledQty;
                bid.filled += filledQty;
                touchedCount++;

                fills.push({
                    price: bid?.price,
                    quantity: filledQty,
                    tradeId: this.lastTrade++,
                    otherUserId: bid?.userId,
                    marketOrderId: bid?.orderId,
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

    // cancelOrder(order: Order): boolean {
    //     const { id: orderId, side: orderSide, userId } = order;

    //     if (orderSide === "BUY") {
    //         const bidIndex = this.bids.findIndex(o => o.id === orderId && o.userId === userId);
    //         if (bidIndex !== -1) {
    //             const resting = this.bids[bidIndex]!;
    //             this.balanceManager.unlockBalance(resting.userId, "USDC", resting.price * resting.quantity);
    //             this.bids.splice(bidIndex, 1);
    //             return true;
    //         }
    //     } else {
    //         const askIndex = this.asks.findIndex(o => o.id === orderId && o.userId === userId);
    //         if (askIndex !== -1) {
    //             const resting = this.asks[askIndex]!;
    //             this.balanceManager.unlockBalance(resting.userId, "SOL", resting.quantity);
    //             this.asks.splice(askIndex, 1);
    //             return true;
    //         }
    //     }

    //     return false;
    // }

    // getDepth(): { asks: { price: number; quantity: number }[]; bids: { price: number; quantity: number }[] } {
    //     const asksMap = new Map<number, number>();
    //     for (const order of this.asks) {
    //         asksMap.set(order.price, (asksMap.get(order.price) ?? 0) + order.quantity);
    //     }

    //     const bidsMap = new Map<number, number>();
    //     for (const order of this.bids) {
    //         bidsMap.set(order.price, (bidsMap.get(order.price) ?? 0) + order.quantity);
    //     }

    //     const asks = Array.from(asksMap.entries())
    //         .map(([price, quantity]) => ({ price, quantity }))
    //         .sort((a, b) => a.price - b.price);

    //     const bids = Array.from(bidsMap.entries())
    //         .map(([price, quantity]) => ({ price, quantity }))
    //         .sort((a, b) => b.price - a.price);

    //     return { asks, bids };
    // }

    // getOpenOrders(userId: string): Order[] {
    //     return this.bids.filter(o => o.userId === userId).concat(
    //         this.asks.filter(o => o.userId === userId)
    //     );
    // }
}