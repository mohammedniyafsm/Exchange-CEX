import express from "express"
import { orderBook, Side } from "./orderbook.js";
import { BalanceManager } from "./engine.js";


const app = express();

app.use(express.json());

app.listen(3001, () => {
	console.log("Server Running at 3001");
});

const book = new orderBook();



const bm = new BalanceManager();
bm.setBalance('user1', 'USDC', 5000);
console.log(bm.lockBalance('user1', 'USDC', 3000)); // true
console.log(bm.balance.get('user1')?.get('USDC')); // { available: 2000, locked: 3000 }

bm.setBalance('user2', 'USDC', 0);
bm.transferBalance('user1', 'user2', 'USDC', 3000);
console.log(bm.balance.get('user1')?.get('USDC')); // { available: 2000, locked: 0 }
console.log(bm.balance.get('user2')?.get('USDC')); // { available: 3000, locked: 0 }

console.log(bm.lockBalance('user1', 'USDC', 5000)); // false — not enough available




// book.createOrder({ id: '1', userId: 'user1', side: Side.SELL, price: 100, quantity: 5 })
// book.createOrder({ id: '2', userId: 'user2', side: Side.SELL, price: 150, quantity: 3 })
// book.createOrder({ id: '3', userId: 'user3', side: Side.SELL, price: 200, quantity: 2 })

// console.log(" ");

// console.log("this is ask", book.asks)
// console.log("this is bid", book.bids)

// book.createOrder({ id: '5', userId: 'user5', side: Side.BUY, price: 150, quantity: 5 })

// console.log("this is ask", book.asks)
// console.log("this is bid", book.bids)

// book.createOrder({ id: '33', userId: 'user33', side: Side.BUY, price: 200, quantity: 5 })
// console.log("this is ask", book.asks)
// console.log("this is bid", book.bids)

// console.log(" ");

// console.log("this is ask", book.asks)
// console.log("this is bid", book.bids)

