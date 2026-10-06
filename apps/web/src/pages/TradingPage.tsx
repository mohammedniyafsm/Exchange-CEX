import { useEffect, useMemo, useState } from 'react'
import { MarketChart } from '../components/trading/MarketChart'
import { OrderBook } from '../components/trading/OrderBook'
import { Toast, type ToastItem } from '../components/ui/Toast'
import { mockApi } from '../services/mockApi'
import type { Candle, Order, OrderBookEntry, OrderSide } from '../types'

const API_URL = 'http://localhost:3001/api/v1'
const PAIR = 'SOL_USDC'
const WS_URL = 'ws://localhost:8081'
const FALLBACK_PRICE = 100.55
type Balance = Record<string, number>
type ApiOrder = Order & { quantity?: number; filled?: number; market?: string }

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) throw new Error(`${response.status}`)
  return response.json() as Promise<T>
}

function unwrap<T>(value: T | { data?: T; payload?: T }): T {
  if (value && typeof value === 'object' && ('data' in value || 'payload' in value)) {
    const wrapped = value as { data?: T; payload?: T }
    return (wrapped.data ?? wrapped.payload) as T
  }
  return value as T
}

type DepthSnapshot = {
  market: string
  streamId?: string
  sequence?: number
  bids?: Array<{ price: number; quantity: number }>
  asks?: Array<{ price: number; quantity: number }>
}

function toOrderBook(depth: DepthSnapshot): { asks: OrderBookEntry[]; bids: OrderBookEntry[]; spread: number } {
  const normalizeSide = (rows: Array<{ price: number; quantity: number }> = [], dir: 'ask' | 'bid') => {
    const byPrice = new Map<number, number>()
    rows.forEach((row) => {
      const price = Number(row.price)
      const quantity = Number(row.quantity)
      if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) return
      byPrice.set(price, (byPrice.get(price) ?? 0) + quantity)
    })

    const normalized = Array.from(byPrice.entries())
      .map(([price, quantity]) => ({ price, size: quantity, total: quantity }))
      .sort((a, b) => (dir === 'ask' ? a.price - b.price : b.price - a.price))

    return normalized
  }

  const asks = normalizeSide(depth.asks ?? [], 'ask')
  const bids = normalizeSide(depth.bids ?? [], 'bid')

  const bestAsk = asks[0]?.price ?? 0
  const bestBid = bids[0]?.price ?? 0

  return {
    asks,
    bids,
    spread: bestAsk && bestBid ? bestAsk - bestBid : 0,
  }
}

export default function TradingPage() {
  const [userId, setUserId] = useState('user1')
  const [candles, setCandles] = useState<Candle[]>([])
  const [orderBook, setOrderBook] = useState<{ asks: OrderBookEntry[]; bids: OrderBookEntry[]; spread: number }>({ asks: [], bids: [], spread: 0 })
  const [orderSide, setOrderSide] = useState<OrderSide>('BUY')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState(String(FALLBACK_PRICE))
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [trades, setTrades] = useState<ApiOrder[]>([])
  const [balance, setBalance] = useState<Balance>({ USDC: 0, SOL: 0 })
  const [tab, setTab] = useState<'open' | 'history'>('open')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastItem | null>(null)

  useEffect(() => {
    async function loadMarket() {
      setLoading(true)
      setCandles(await mockApi.getCandles('SOL/USDT', '1H'))
      try {
        const depth = unwrap<DepthSnapshot>(await getJson<DepthSnapshot>(`/depth/${PAIR}`))
        setOrderBook(toOrderBook(depth))
      } catch {
        setOrderBook(await mockApi.getOrderBook('SOL/USDT'))
      }
      setLoading(false)
    }
    void loadMarket()
  }, [])

  useEffect(() => {
    const socket = new WebSocket(WS_URL)

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [`market:depth:${PAIR}`],
      }))
    })

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as DepthSnapshot & { type?: string }
        if (!payload || !payload.type || !['DEPTH_UPDATE', 'DEPTH_SNAPSHOT'].includes(payload.type)) {
          return
        }
        setOrderBook((current) => {
          const next = toOrderBook(payload)
          const merged = {
            asks: next.asks.length > 0 ? next.asks : current.asks,
            bids: next.bids.length > 0 ? next.bids : current.bids,
            spread: next.spread || current.spread,
          }
          return merged
        })
      } catch {
        // ignore malformed socket frames
      }
    })

    return () => socket.close()
  }, [])

  useEffect(() => {
    async function loadUserData() {
      try {
        const [nextBalance, nextOrders, nextTrades] = await Promise.all([
          getJson<Balance | { data: Balance }>(`/balance/${userId}`),
          getJson<ApiOrder[] | { data: ApiOrder[] }>(`/orders/${userId}?status=OPEN`),
          getJson<ApiOrder[] | { data: ApiOrder[] }>(`/trades/${userId}`)
        ])
        setBalance(unwrap(nextBalance))
        setOrders(unwrap(nextOrders))
        setTrades(unwrap(nextTrades))
      } catch {
        const fallback = await mockApi.getOrders()
        setOrders(fallback.filter((order) => order.status === 'OPEN'))
        setTrades(fallback.filter((order) => order.status !== 'OPEN'))
      }
    }
    void loadUserData()
  }, [userId])

  const currentPrice = useMemo(() => candles[candles.length - 1]?.close ?? FALLBACK_PRICE, [candles])
  const chartCandles = useMemo(() => candles.map((candle) => ({
    t: Date.parse(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume
  })), [candles])
  const change = useMemo(() => ((currentPrice - (candles[0]?.close ?? currentPrice)) / (candles[0]?.close ?? currentPrice)) * 100, [candles, currentPrice])
  const total = (Number(price) || 0) * (Number(quantity) || 0)

  async function handlePlaceOrder() {
    if (!Number(quantity) || Number(quantity) <= 0 || !Number(price) || Number(price) <= 0) {
      setToast({ id: Date.now(), message: 'Enter a valid price and quantity', type: 'error' })
      return
    }
    try {
      const response = await fetch(`${API_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pair: PAIR, side: orderSide, quantity: Number(quantity), price: Number(price), userId }) })
      if (!response.ok) throw new Error('Order rejected')
      setToast({ id: Date.now(), message: `${orderSide === 'BUY' ? 'Buy' : 'Sell'} order submitted`, type: 'success' })
      const refreshed = await getJson<ApiOrder[] | { data: ApiOrder[] }>(`/orders/${userId}?status=OPEN`)
      setOrders(unwrap(refreshed))
    } catch (error) {
      setToast({ id: Date.now(), message: error instanceof Error ? error.message : 'Unable to place order', type: 'error' })
    }
  }

  return <div className="backpack-app">
    <aside className="backpack-sidebar">
      <div className="sidebar-brand"><span className="brand-mark">₿</span><span>Backpack</span></div>
      <nav className="sidebar-nav">
        <button className="nav-item active">Home</button>
        <button className="nav-item">Trade</button>
        <button className="nav-item">Lend</button>
        <button className="nav-item">BP</button>
        <button className="nav-item">Tools</button>
        <button className="nav-item">More</button>
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item footer-item">Collapse</button>
        <button className="nav-item footer-item">Support</button>
      </div>
    </aside>

    <div className="backpack-workspace">
      <header className="workspace-header">
        <div className="browser-bar">
          <div className="browser-actions">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="browser-search">Search markets, stocks, and more</div>
        </div>
        <div className="workspace-actions">
          <button className="ghost-btn">Log in</button>
          <button className="primary-btn">Sign up</button>
        </div>
      </header>

      <div className="market-strip">
        <div className="market-pill">
          <span className="coin">₿</span>
          <span>BTC/USD</span>
          <span className="mini-badge">8x</span>
        </div>
        <div className="market-metrics">
          <span className="metric-number">85,345.6</span>
          <span className="metric-value negative">-15.5 -0.02%</span>
          <span>24H Change</span>
          <span>24H High</span>
          <span>24H Low</span>
          <span>24H Volume (USD)</span>
        </div>
      </div>

      <div className="backpack-content">
        <main className="panel center-panel">
          <div className="chart-toolbar">
            <div className="chart-tabs">
              <button className="chart-tab active">Chart</button>
              <button className="chart-tab">Depth</button>
              <button className="chart-tab">Margin</button>
              <button className="chart-tab">Market Info</button>
            </div>
            <div className="chart-actions">
              <button>1h</button>
              <button>Indicators</button>
              <button>Reset</button>
            </div>
          </div>
          <MarketChart data={chartCandles} loading={loading} live />
        </main>

        <div className="right-stack">
          <section className="panel orderbook-panel">
            <div className="panel-header">Order Book</div>
            <OrderBook asks={orderBook.asks} bids={orderBook.bids} spread={orderBook.spread} />
          </section>

          <aside className="panel order-form">
            <div className="form-tabs"><button className={orderSide === 'BUY' ? 'buy active' : ''} onClick={() => setOrderSide('BUY')}>Buy</button><button className={orderSide === 'SELL' ? 'sell active' : ''} onClick={() => setOrderSide('SELL')}>Sell</button></div>
            <div className="side-mode">
              <button className="mode-pill active">Limit</button>
              <button className="mode-pill">Market</button>
              <button className="mode-pill">Conditional</button>
            </div>
            <label>Price (USDC)<input type="number" value={price} onChange={(event) => setPrice(event.target.value)} min="0" step="0.01" /></label>
            <label>Quantity (SOL)<input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} min="0" step="0.01" /></label>
            <div className="total-row"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
            <button className={`submit ${orderSide === 'BUY' ? 'buy-bg' : 'sell-bg'}`} onClick={() => void handlePlaceOrder()}>{orderSide === 'BUY' ? 'Buy SOL' : 'Sell SOL'}</button>
            <p className="available">Available: {(balance[orderSide === 'BUY' ? 'USDC' : 'SOL'] ?? 0).toFixed(4)} {orderSide === 'BUY' ? 'USDC' : 'SOL'}</p>
          </aside>
        </div>
      </div>

      <section className="orders-panel panel">
        <div className="tabs"><button className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}>Open Orders</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Order History</button></div>
        <OrderTable orders={tab === 'open' ? orders : trades} open={tab === 'open'} />
      </section>
    </div>

    <Toast toast={toast} onClose={() => setToast(null)} />
  </div>
}

function OrderTable({ orders, open }: { orders: ApiOrder[]; open: boolean }) {
  return <div className="table-wrap"><table><thead><tr><th>Side</th><th>Price</th><th>Quantity</th><th>Filled</th><th>Status</th>{open && <th />}</tr></thead><tbody>{orders.length === 0 ? <tr><td colSpan={open ? 6 : 5} className="empty">No orders yet</td></tr> : orders.map((order, index) => <tr key={order.id ?? index}><td className={order.side === 'BUY' ? 'positive' : 'negative'}>{order.side}</td><td>{Number(order.price).toFixed(2)}</td><td>{Number(order.quantity ?? order.amount).toFixed(4)}</td><td>{Number(order.filled ?? 0).toFixed(4)}</td><td>{order.status}</td>{open && <td><button className="cancel" disabled>Cancel</button></td>}</tr>)}</tbody></table></div>
}
