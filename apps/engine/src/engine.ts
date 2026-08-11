type Balance = {
    available: number,
    locked: number,
}

export class BalanceManager {
     balance: Map<string, Map<string, Balance>> = new Map();

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
        const toBal = this.balance.get(toUserId)?.get(asset);

        if (!fromBal || !toBal) return;

        fromBal.locked -= amount;
        toBal.available += amount;
    }
}