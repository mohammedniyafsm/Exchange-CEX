import { buildCandles, buildMarkets, buildOrderBook, demoOrders, demoPortfolio, demoPositions, demoWalletAssets } from '../data/seed'
import type { Candle, Market, Order, OrderBookEntry, Portfolio, Position, SymbolPair, Timeframe, WalletAsset } from '../types'
import type { TradingApi } from './api'

const markets: Market[] = buildMarkets()

export const mockApi: TradingApi = {
  async getMarkets(): Promise<Market[]> {
    return markets
  },
  async getCandles(symbol: SymbolPair, timeframe: Timeframe): Promise<Candle[]> {
    const candles = buildCandles(symbol)
    const scale = { '1m': 1, '5m': 1.4, '15m': 1.8, '1H': 2.2, '4H': 2.7, '1D': 3.5 }[timeframe] ?? 1
    return candles.slice(0, Math.max(60, Math.min(180, Math.round(candles.length / scale))))
  },
  async getOrderBook(symbol: SymbolPair): Promise<{ asks: OrderBookEntry[]; bids: OrderBookEntry[]; spread: number }> {
    return buildOrderBook(symbol)
  },
  async getOrders(): Promise<Order[]> {
    return demoOrders
  },
  async getPositions(): Promise<Position[]> {
    return demoPositions
  },
  async getPortfolio(): Promise<Portfolio> {
    return demoPortfolio
  },
  async placeOrder(order: Partial<Order>): Promise<Order> {
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      pair: order.pair ?? 'SOL/USDT',
      side: order.side ?? 'BUY',
      type: order.type ?? 'MARKET',
      amount: order.amount ?? 0,
      price: order.price ?? 0,
      status: order.type === 'LIMIT' ? 'OPEN' : 'FILLED',
      createdAt: new Date().toISOString()
    }
    demoOrders.unshift(newOrder)
    return newOrder
  },
  async cancelOrder(orderId: string): Promise<void> {
    const found = demoOrders.find((order) => order.id === orderId)
    if (found) {
      found.status = 'CANCELLED'
    }
  },
  async getWallet(): Promise<WalletAsset[]> {
    return demoWalletAssets
  }
}
