# Centralised exchange

I happen to learn some Finance terms before building this, here are some

- Limit Order - Buy/sell an asset at a particular price, the trade might not execute immediately.
- Market Order - Buy/sell an asset at the best available price, trade will happen immediately.
- Order Book - List of all buy and sell orders, sorted by price. 
- Liquidity - How easily an asset can be bought/sold. More liquid an exchange is, the better is the exchange 
- Spread - Difference between the highest buy price and lowest sell price, lesser the spread, more the liquidity.
- Maker / Market maker - someone who adds liquidity, by adding orders on both sides, in order for trades to be executed smoothly, companies like Citadel provides these making, in return they get better prices, lesser trading fees etc. 
- Slippage - Difference between expected price and the actual price, may arise due to latency, or other reasons. We can put an upper cap.
- Leverage - Borrowing money to trade bigger positions, higher the leverage, your position in the asset becomes higher
- Margin - The amount we put against getting leverage, once the margin we put is exhausted, our leveraged position is closed.
- Arbitrage - Buying low on one market, selling high on another for profit.
- Limit price - Even while making a market order, an upper cap to the price of asset is automatically put in order to get the asset at a fair price. This is also known as quote of the order. 
- Price of an asset - is the price at which the last trade of that asset happened.
- Depth - shows quantity of orders (both buy and sell) available at a particular time
- Ticker - just a snapshot of the market at a particular instance of time

## Project Architecture

![Architecture](./Architecture.png)

## About

Centralised exchanges are fascinating. This repo is my naive attempt, to mimic the architecture of a trading exchange. I am using a distributed
system approach, to keep things peristant, scalable and fast. 

A primary metric in these systems is the trade execution time. I was able to achieve sub 10ms latency running my app locally, which is considered good.

### Components Breakdown

- **Backend API (TypeScript)**  
  → Entry point for all client actions.  
  → Forwards trade/order requests to Redis Queue and handles responses through Pub/Sub.

- **Redis Queue**  
  → Message queue ensuring asynchronous, high-throughput communication between backend and engine.

- **Engine**  
  → Core trading logic lives here.  
  → Maintains in-memory **order books**, and user balances,  matches buy/sell orders, and publishes trade events.

- **Pub/Sub System (Redis)**  
  → Facilitates real-time communication between backend, engine, WebSocket server, and database processor.

- **WebSocket Server**  
  → Streams live tickers, trades, and order book updates directly to browsers.

- **DB Processor**  
  → Listens to trade events via Pub/Sub and updates the database asynchronously.

- **Database (Postgres)**  
  → Persistent store for trades.

- Docker 
 -> For running the entire app, run `docker compose up --build`
---

## Local trading UI integration

The web trade screen uses the existing API, matching engine, Redis, and WebSocket services. It reads SOL/USDC candles, recent trades, and order-book depth from the backend; orders and balances require a signed-in account.

1. Configure PostgreSQL in `packages/database/.env` and apply the Prisma schema with `pnpm --filter @repo/db db:push`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`, `REDIS_URL`, `WEB_ORIGIN`, and a unique, long `JWT_SECRET`. Never use the example JWT value in a deployed environment.
3. Configure the matching engine and WebSocket server with the same Redis URL. `apps/engine/.env.example` and `apps/websocket/.env.example` show the expected variables.
4. Start Redis and PostgreSQL, then run `pnpm --filter backend dev`, `pnpm --filter engine dev`, and `pnpm --filter websocket dev` in separate terminals. Run the database worker as well to persist matching-engine order, balance, and trade updates.
5. Start the web app with `pnpm --filter web dev`. The frontend defaults to `http://localhost:3001/api/v1` and `ws://localhost:8081`; set `VITE_API_URL` or `VITE_WS_URL` in `apps/web/.env` to override them.

The API listens on port 3001 and the market WebSocket server on port 8081 by default. Account endpoints verify the bearer JWT and confirm that its user still exists. Live depth and trades come from this matching engine, not an external exchange feed. Market candles are built from persisted trades, so a new database with no executions will correctly show no candle history until trades have been recorded.
