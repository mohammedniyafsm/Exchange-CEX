import express from "express"
import { orderBook, Side } from "./orderbook.js";
import { BalanceManager } from "./engine.js";


const app = express();

app.use(express.json());

app.listen(3001, () => {
	console.log("Server Running at 3001");
});


const bm = new BalanceManager();
const book = new orderBook(bm);


bm.setBalance('user1', 'USDC', 10000);
bm.setBalance('user2', 'SOL', 2);
bm.setBalance('user3', 'SOL', 2);
bm.setBalance('user4', 'SOL', 2);

book.createOrder({ id: '101', userId: 'user1', side: Side.BUY, price: 2000, quantity: 5 });

book.createOrder({ id: '99', userId: 'user2', side: Side.SELL, price: 1000, quantity: 2 });
book.createOrder({ id: '123', userId: 'user3', side: Side.SELL, price: 1500, quantity: 2 });
book.createOrder({ id: '100', userId: 'user4', side: Side.SELL, price: 1600, quantity: 2 });



console.log("this is ask", book.asks)
console.log("this is bid", book.bids)


console.log(" THIS IS USDC BALANCE CHECK");

console.log("user2 ",bm.balance.get('user2')?.get('USDC'))
console.log("user3",bm.balance.get('user3')?.get('USDC'))
console.log("user4",bm.balance.get('user4')?.get('USDC'))
console.log("user1",bm.balance.get('user1')?.get('USDC'))


console.log(" THIS IS SOLANA BALANCE CHECK");

console.log("AFTER USER1 MAKE A BUY REQUEST FOR SOLANA FOR USDC ",bm.balance.get('user1')?.get('SOL'))
console.log("AFTER USER2 MAKE A SELL REQUEST FOR USDC FOR SOLANA ",bm.balance.get('user2')?.get('SOL'))
console.log("AFTER USER2 MAKE A SELL REQUEST FOR USDC FOR SOLANA ",bm.balance.get('user3')?.get('SOL'))
console.log("AFTER USER2 MAKE A SELL REQUEST FOR USDC FOR SOLANA ",bm.balance.get('user4')?.get('SOL'))



