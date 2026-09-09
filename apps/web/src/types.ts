export type SymbolPair = 'BTC/USDT' | 'ETH/USDT' | 'SOL/USDT' | 'BNB/USDT' | 'XRP/USDT' | 'DOGE/USDT' | 'ADA/USDT' | 'AVAX/USDT'

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D'

export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP LIMIT'
export type OrderStatus = 'OPEN' | 'FILLED' | 'CANCELLED'

export type Market = {
  symbol: SymbolPair
  last: number
  change24h: number
  volume: number
  high: number
  low: number
}

export type Candle = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OrderBookEntry = {
  price: number
  size: number
  total: number
}

export type Order = {
  id: string
  pair: SymbolPair
  side: OrderSide
  type: OrderType
  amount: number
  price: number
  status: OrderStatus
  createdAt: string
}

export type Position = {
  id: string
  symbol: SymbolPair
  side: 'LONG' | 'SHORT'
  size: number
  entryPrice: number
  markPrice: number
  liquidationPrice: number
  tp?: number
  sl?: number
  pnl: number
}

export type Portfolio = {
  totalBalance: number
  available: number
  inOrders: number
  unrealizedPnl: number
  pnl24h: number
}

export type WalletAsset = {
  symbol: string
  balance: number
  available: number
  inOrders: number
  usdValue: number
  change24h: number
}
