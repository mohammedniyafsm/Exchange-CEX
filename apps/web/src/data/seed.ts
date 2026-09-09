import type { Candle, Market, Order, OrderBookEntry, Position, Portfolio, SymbolPair, WalletAsset } from '../types'

export const symbolList: SymbolPair[] = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT']

const priceMap: Record<SymbolPair, number> = {
  'BTC/USDT': 111245.32,
  'ETH/USDT': 4285.91,
  'SOL/USDT': 201.42,
  'BNB/USDT': 982.21,
  'XRP/USDT': 2.91,
  'DOGE/USDT': 0.231,
  'ADA/USDT': 0.94,
  'AVAX/USDT': 45.1
}

export const buildMarkets = (): Market[] =>
  symbolList.map((symbol, index) => ({
    symbol,
    last: priceMap[symbol],
    change24h: [2.41, 1.82, 2.31, 1.11, -0.84, 4.2, 1.69, -1.23][index] ?? 0,
    volume: [1650000000, 840000000, 520000000, 280000000, 210000000, 150000000, 98000000, 62000000][index] ?? 0,
    high: priceMap[symbol] * (1 + (index % 3) * 0.04),
    low: priceMap[symbol] * (1 - (index % 2) * 0.06)
  }))

export const buildCandles = (symbol: SymbolPair): Candle[] => {
  const base = priceMap[symbol]
  const candles: Candle[] = []
  let current = base * 0.96

  for (let i = 0; i < 180; i += 1) {
    const next = current + (Math.sin(i / 8) * (base * 0.018 + i * 0.0001)) + (Math.random() - 0.5) * base * 0.01
    const open = current
    const close = next
    const high = Math.max(open, close) + Math.abs(Math.random()) * base * 0.008
    const low = Math.min(open, close) - Math.abs(Math.random()) * base * 0.008
    const volume = Math.random() * (base * 0.8) + 75
    candles.push({
      time: new Date(Date.now() - (180 - i) * 60_000).toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2))
    })
    current = next
  }

  return candles
}

export const buildOrderBook = (symbol: SymbolPair): { asks: OrderBookEntry[]; bids: OrderBookEntry[]; spread: number } => {
  const base = priceMap[symbol]
  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: Number((base + 0.1 + i * 0.08).toFixed(2)),
    size: Number((0.8 + i * 0.55 + Math.random() * 1.2).toFixed(2)),
    total: 0
  }))
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: Number((base - 0.06 - i * 0.07).toFixed(2)),
    size: Number((0.9 + i * 0.4 + Math.random() * 1.1).toFixed(2)),
    total: 0
  }))

  asks.forEach((row, index) => {
    asks[index].total = Number((asks.slice(0, index + 1).reduce((sum, entry) => sum + entry.size, 0)).toFixed(2))
  })
  bids.forEach((row, index) => {
    bids[index].total = Number((bids.slice(0, index + 1).reduce((sum, entry) => sum + entry.size, 0)).toFixed(2))
  })

  return {
    asks: asks.reverse(),
    bids: bids.reverse(),
    spread: Number((asks[asks.length - 1].price - bids[0].price).toFixed(2))
  }
}

export const demoOrders: Order[] = [
  {
    id: 'ORD-1001',
    pair: 'SOL/USDT',
    side: 'BUY',
    type: 'LIMIT',
    amount: 2.5,
    price: 201.0,
    status: 'OPEN',
    createdAt: '2026-09-03T14:02:00Z'
  },
  {
    id: 'ORD-1002',
    pair: 'BTC/USDT',
    side: 'SELL',
    type: 'LIMIT',
    amount: 0.12,
    price: 110800,
    status: 'OPEN',
    createdAt: '2026-09-03T13:44:00Z'
  },
  {
    id: 'ORD-1003',
    pair: 'SOL/USDT',
    side: 'BUY',
    type: 'MARKET',
    amount: 1.2,
    price: 201.42,
    status: 'FILLED',
    createdAt: '2026-09-03T12:10:00Z'
  }
]

export const demoPositions: Position[] = [
  {
    id: 'POS-1',
    symbol: 'SOL/USDT',
    side: 'LONG',
    size: 2.5,
    entryPrice: 198.5,
    markPrice: 201.42,
    liquidationPrice: 165.2,
    tp: 205,
    sl: 195,
    pnl: 7.3
  },
  {
    id: 'POS-2',
    symbol: 'ETH/USDT',
    side: 'LONG',
    size: 0.7,
    entryPrice: 4100,
    markPrice: 4285.91,
    liquidationPrice: 3820,
    tp: 4400,
    sl: 3960,
    pnl: 130.14
  }
]

export const demoPortfolio: Portfolio = {
  totalBalance: 12482.51,
  available: 9240.22,
  inOrders: 1242.19,
  unrealizedPnl: 182.4,
  pnl24h: 2.41
}

export const demoWalletAssets: WalletAsset[] = [
  { symbol: 'BTC', balance: 0.0842, available: 0.0842, inOrders: 0, usdValue: 9365.21, change24h: 1.82 },
  { symbol: 'ETH', balance: 1.42, available: 1.12, inOrders: 0.3, usdValue: 6085.32, change24h: 2.21 },
  { symbol: 'SOL', balance: 12.42, available: 10, inOrders: 2.42, usdValue: 2502.44, change24h: 3.12 },
  { symbol: 'USDT', balance: 4220.52, available: 4220.52, inOrders: 0, usdValue: 4220.52, change24h: 0.12 }
]
