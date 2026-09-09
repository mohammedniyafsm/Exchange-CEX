# CryptoLattice Web Frontend

This app is a Vite + React + TypeScript trading dashboard built to run in demo mode without any backend dependency.

## Install

```bash
cd apps/web
npm install
```

## Run

```bash
npm run dev
```

The app starts on http://localhost:5173.

## Architecture

- `src/pages` contains route-level screens.
- `src/components` contains the trading terminal UI and reusable blocks.
- `src/services/mockApi.ts` is the mock data layer.
- `src/types.ts` defines the platform contracts.
- `src/data/seed.ts` generates realistic market, candle, order book, and portfolio mock data.
- `src/App.tsx` wires routing between `/trade`, `/markets`, `/portfolio`, `/orders`, `/wallet`, and `/settings`.

## Mock API

The UI is intentionally built around a service abstraction:

- `services/api.ts` defines the contract for future backend integration.
- `services/mockApi.ts` implements the same interface with demo data.

This keeps the UI independent from the data source and makes it easy to switch to a real REST or WebSocket backend later.

## Future backend integration

To connect real APIs later, replace `mockApi` with an implementation that calls the backend while preserving the same methods:

- `getMarkets()`
- `getCandles(symbol, timeframe)`
- `getOrderBook(symbol)`
- `getOrders()`
- `getPositions()`
- `getPortfolio()`
- `placeOrder(order)`
- `cancelOrder(orderId)`

## WebSocket integration

The mock stream is currently simulated with intervals in the trading page. The future WebSocket integration point is the service layer or a dedicated market data provider that emits ticker, orderbook, candle, and order update events.

## Market data flow

1. Route selects a trading pair such as `/trade/SOL-USDT`.
2. `TradingPage` reads the selected market from the mock market list.
3. Candle and order book data are fetched from the mock API.
4. The chart and book update as demo data refreshes every few seconds.

## Orders

Demo orders are created client-side and appended to the mock state. Limit orders remain open; market orders are filled immediately. This keeps the trading flow interactive while remaining backend-free.
