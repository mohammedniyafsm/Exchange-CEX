import type { Candle, Market, Order, OrderBookEntry, Portfolio, Position, SymbolPair, Timeframe, WalletAsset } from '../types'

export interface TradingApi {
  getMarkets(): Promise<Market[]>
  getCandles(symbol: SymbolPair, timeframe: Timeframe): Promise<Candle[]>
  getOrderBook(symbol: SymbolPair): Promise<{ asks: OrderBookEntry[]; bids: OrderBookEntry[]; spread: number }>
  getOrders(): Promise<Order[]>
  getPositions(): Promise<Position[]>
  getPortfolio(): Promise<Portfolio>
  placeOrder(order: Partial<Order>): Promise<Order>
  cancelOrder(orderId: string): Promise<void>
  getWallet(): Promise<WalletAsset[]>
}
