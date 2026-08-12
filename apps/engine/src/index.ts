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

book.balanceManager.setBalance('user1',"USDC",10000);
book.balanceManager.setBalance('user2',"SOL",5);
book.balanceManager.setBalance('user3',"SOL",4);
book.balanceManager.setBalance('user4',"SOL",1);


book.createOrder({ id: '1', userId: 'user2', side: Side.SELL, price: 1500, quantity: 2 });
book.createOrder({ id: '2', userId: 'user3', side: Side.SELL, price: 1500, quantity: 3 });
book.createOrder({ id: '3', userId: 'user4', side: Side.SELL, price: 1600, quantity: 1 });
book.createOrder({ id: '4', userId: 'user1', side: Side.BUY, price: 900, quantity: 4 });

console.log(book.getDepth());



