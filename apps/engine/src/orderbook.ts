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

    createOrder(order: Order) {

        if (order.side == 'BUY') {
            return this.matchBuys(order);
        }

        if (order.side == 'SELL') {
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


            if (ask?.quantity == 0) {
                this.asks.shift();
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

            if (bid.quantity == 0) {
                this.bids.shift();
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
}