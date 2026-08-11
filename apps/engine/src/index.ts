import express from "express"
import { orderBook, Side } from "./orderbook.js";


const app = express();

app.use(express.json());

app.listen(3001,()=>{
	console.log("Server Running at 3001");
});

const book = new orderBook();



console.log(book.createOrder({ id: '1', userId: 'user1', side: Side.SELL, price: 100, quantity: 5 }));
console.log('asks after order 1:', book.asks);

// buy order that should match it
console.log(book.createOrder({ id: '2', userId: 'user2', side: Side.BUY, price: 100, quantity: 3 }));
console.log('asks after order 2:', book.asks); // should show 2 left on the resting sell
console.log('bids after order 2:', book.bids); // should be empty — fully matched

// buy order that partially matches, rest goes into bids
console.log(book.createOrder({ id: '3', userId: 'user3', side: Side.BUY, price: 100, quantity: 5 }));
console.log('asks after order 3:', book.asks); // should be empty — the last 2 units got consumed
console.log('bids after order 3:', book.bids); // should show order 3 resting with quantity 3

