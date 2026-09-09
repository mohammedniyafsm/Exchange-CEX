import { useEffect, useMemo, useState } from 'react'
import { CandlestickChart } from '../components/trading/CandlestickChart'
import { OrderBook } from '../components/trading/OrderBook'
import { Toast, type ToastItem } from '../components/ui/Toast'
import { mockApi } from '../services/mockApi'
import type { Candle, Order, OrderBookEntry, OrderSide } from '../types'

const API_URL = 'http://localhost:3001/api/v1'
const PAIR = 'SOL_USDC'
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
        setOrderBook(unwrap(await getJson<{ asks: OrderBookEntry[]; bids: OrderBookEntry[]; spread: number }>(`/orderbook/${PAIR}`)))
      } catch {
        setOrderBook(await mockApi.getOrderBook('SOL/USDT'))
      }
      setLoading(false)
    }
    void loadMarket()
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

  return <div className="trading-app">
    <header className="topbar"><strong className="wordmark">CryptoLattice</strong><div className="market-summary"><b>SOL/USDC</b><span className="price">${currentPrice.toFixed(2)}</span><span className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span></div><label className="user-select">User: <select value={userId} onChange={(event) => setUserId(event.target.value)}><option value="user1">User 1</option><option value="user2">User 2</option></select></label></header>
    <Toast toast={toast} onClose={() => setToast(null)} />
    <div className="terminal-grid">
      <section className="panel orderbook-panel"><OrderBook asks={orderBook.asks} bids={orderBook.bids} spread={orderBook.spread} /></section>
      <main className="center-panel"><section className="panel chart-panel"><div className="panel-heading"><span>SOL/USDC · 1H</span><span className="muted">{loading ? 'Loading market data...' : 'Spot market'}</span></div><CandlestickChart candles={candles} currentPrice={currentPrice} /></section><section className="panel history-panel"><div className="tabs"><button className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}>Open Orders</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Order History</button></div><OrderTable orders={tab === 'open' ? orders : trades} open={tab === 'open'} /></section></main>
      <section className="panel order-form"><div className="form-tabs"><button className={orderSide === 'BUY' ? 'buy active' : ''} onClick={() => setOrderSide('BUY')}>Buy</button><button className={orderSide === 'SELL' ? 'sell active' : ''} onClick={() => setOrderSide('SELL')}>Sell</button></div><label>Price (USDC)<input type="number" value={price} onChange={(event) => setPrice(event.target.value)} min="0" step="0.01" /></label><label>Quantity (SOL)<input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} min="0" step="0.01" /></label><div className="total-row"><span>Total</span><strong>${total.toFixed(2)}</strong></div><button className={`submit ${orderSide === 'BUY' ? 'buy-bg' : 'sell-bg'}`} onClick={() => void handlePlaceOrder()}>{orderSide === 'BUY' ? 'Buy SOL' : 'Sell SOL'}</button><p className="available">Available: {(balance[orderSide === 'BUY' ? 'USDC' : 'SOL'] ?? 0).toFixed(4)} {orderSide === 'BUY' ? 'USDC' : 'SOL'}</p></section>
    </div>
  </div>
}

function OrderTable({ orders, open }: { orders: ApiOrder[]; open: boolean }) {
  return <div className="table-wrap"><table><thead><tr><th>Side</th><th>Price</th><th>Quantity</th><th>Filled</th><th>Status</th>{open && <th />}</tr></thead><tbody>{orders.length === 0 ? <tr><td colSpan={open ? 6 : 5} className="empty">No orders yet</td></tr> : orders.map((order, index) => <tr key={order.id ?? index}><td className={order.side === 'BUY' ? 'positive' : 'negative'}>{order.side}</td><td>{Number(order.price).toFixed(2)}</td><td>{Number(order.quantity ?? order.amount).toFixed(4)}</td><td>{Number(order.filled ?? 0).toFixed(4)}</td><td>{order.status}</td>{open && <td><button className="cancel" disabled>Cancel</button></td>}</tr>)}</tbody></table></div>
}
