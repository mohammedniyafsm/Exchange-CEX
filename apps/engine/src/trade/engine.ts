import type { Side } from "./orderbook.js";
import { randomUUID } from "crypto";


type UserBalance = {
    [key: string]: {
        available: number,
        locked: number,
    }
}

const BASE_CURRENCY = "USDC"


export class MatchEngine {
    private balance: Map<string, UserBalance> = new Map();
    private orderBooks: any = [];

    constructor(balance: Map<string, UserBalance>) {
        this.balance = balance;
    }

    process({ clientId, message }) {

        switch (message.type) {
            case "CREATE_ORDER":
                const { userId, asset, price, quantity } = message.data;

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

    }


    checkAndUpdateFund(userId: string, baseAsset: string, quoteAsset: string, price: string, quantity: string, side: Side) {
        let userBalance = this.balance.get(userId);
        if (!userBalance) {
            throw new Error("User balance not found");
        }

        if (side === "BUY") {
            if ((userBalance[quoteAsset]?.available | 0) < Number(price) * Number(quantity)) {
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

    updateFunds(userId: string, baseAsset: string, quoteAsset: string, side: string, fills: [], executed: string) {
        try {
            if (side === "BUY") {
                
            } else if (side === "SELL") {

            }
        } catch (error) {
            console.log("ERROR IN UPDATING FUNDS");

        }
    }






type OnAvailableChange = (userId: string, asset: string, newAvailable: number) => void;

export class BalanceManager {
    balance: Map<string, Map<string, Balance>> = new Map();
    private onAvailableChange?: OnAvailableChange;

    setOnAvailableChange(callback: OnAvailableChange) {
        this.onAvailableChange = callback;
    }

    private notifyChange(userId: string, asset: string) {
        const newAvailable = this.balance.get(userId)?.get(asset)?.available;
        if (newAvailable !== undefined && this.onAvailableChange) {
            this.onAvailableChange(userId, asset, newAvailable);
        }
    }


    setBalance(userId: string, asset: string, amount: number): void {
        if (!this.balance.get(userId)) {
            this.balance.set(userId, new Map());
        }
        let userBalance = this.balance.get(userId);
        userBalance?.set(asset, {
            available: amount,
            locked: 0,
        })
    }

    lockBalance(userId: string, asset: string, amount: number): boolean {

        let userBalance = this.balance.get(userId);
        if (!userBalance) return false;

        let assestBalance = userBalance.get(asset);
        if (!assestBalance) return false;

        if (assestBalance.available >= amount) {
            assestBalance.available -= amount;
            assestBalance.locked += amount;
            return true;
        }
        return false;
    }

    unlockBalance(userId: string, asset: string, amount: number): void {
        const userBalances = this.balance.get(userId);
        if (!userBalances) return;

        const bal = userBalances.get(asset);
        if (!bal) return;

        bal.available += amount;
        bal.locked -= amount;
    }

    transferBalance(fromUserId: string, toUserId: string, asset: string, amount: number): void {
        const fromBal = this.balance.get(fromUserId)?.get(asset);
        if (!fromBal) {
            console.log(`transfer failed: ${fromUserId} has no ${asset} balance`);
            return;
        }

        if (!this.balance.has(toUserId)) {
            this.balance.set(toUserId, new Map());
        }
        const toUserBalances = this.balance.get(toUserId)!;
        if (!toUserBalances.has(asset)) {
            toUserBalances.set(asset, { available: 0, locked: 0 });
        }
        const toBal = toUserBalances.get(asset)!;

        fromBal.locked -= amount;
        toBal.available += amount;
    }
}


