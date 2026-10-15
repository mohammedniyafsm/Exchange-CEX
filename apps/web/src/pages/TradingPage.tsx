import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  CandlestickChart,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CircleHelp,
  Globe,
  Home,
  Layers3,
  LockKeyhole,
  MoreHorizontal,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  WalletCards,
  X,
} from 'lucide-react'
import { AuthDialog } from '../components/auth/AuthDialog'
import { MarketChart, type MarketChartCandle } from '../components/trading/MarketChart'
import { apiRequest, getAccessToken, marketSocketUrl, setAccessToken } from '../services/http'

type BookRow = { price: number; size: number; total: number }
type SidebarPanel = 'balances' | 'orders'
const format = (value: number, digits = 2) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const market = 'SOL_USDC'
type AuthUser = { id: string; email: string }
type ApiBalance = { asset: string; available: string; locked: string }
type ApiOrder = { id: string; market: string; side: 'BUY' | 'SELL'; price: number; quantity: number; filled: number; status: string; createdAt: string }
type MarketTrade = { id: number; type: 'TRADE_UPDATE'; market: string; t: number; price: number; quantity: number; side?: 'BUY' | 'SELL' }
type DepthMessage = { type: 'DEPTH_UPDATE'; market: string; bids: { price: number; quantity: number }[]; asks: { price: number; quantity: number }[] }
type DepthResponse = { market: string; bids: { price: number; quantity: number }[]; asks: { price: number; quantity: number }[] }
type CandleResponse = { candles: MarketChartCandle[] }

function makeBookRows(rows: { price: number; quantity: number }[]): BookRow[] {
  let total = 0
  return rows.map(({ price, quantity }) => {
    total += quantity
    return { price, size: quantity, total }
  })
}

export default function TradingPage() {
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [percent, setPercent] = useState(0)
  const [marketTab, setMarketTab] = useState<'Book' | 'Trades'>('Book')
  const [chartRange, setChartRange] = useState('All')
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel | null>(null)
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [candles, setCandles] = useState<MarketChartCandle[]>([])
  const [asks, setAsks] = useState<BookRow[]>([])
  const [bids, setBids] = useState<BookRow[]>([])
  const [balances, setBalances] = useState<ApiBalance[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [trades, setTrades] = useState<MarketTrade[]>([])
  const [marketConnected, setMarketConnected] = useState(false)
  const [marketError, setMarketError] = useState('')
  const [accountError, setAccountError] = useState('')
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  const currentPrice = candles[candles.length - 1]?.close ?? trades[0]?.price ?? null
  const orderValue = useMemo(() => Number(price || 0) * Number(quantity || 0), [price, quantity])
  const quoteBalance = Number(balances.find((balance) => balance.asset === 'USDC')?.available ?? 0)
  const baseBalance = Number(balances.find((balance) => balance.asset === 'SOL')?.available ?? 0)
  const openOrders = orders.filter((order) => order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED')
  const totalAskDepth = asks.reduce((total, row) => total + row.size, 0)
  const totalBidDepth = bids.reduce((total, row) => total + row.size, 0)
  const totalDepth = totalAskDepth + totalBidDepth
  const bidDepthPercent = totalDepth ? Math.round(totalBidDepth / totalDepth * 100) : 0
  const dayCandles = candles.filter((candle) => candle.t >= Date.now() - 24 * 60 * 60 * 1000)
  const dayOpen = dayCandles[0]?.open
  const dayChange = dayOpen && currentPrice != null ? ((currentPrice - dayOpen) / dayOpen) * 100 : null
  const dayHigh = dayCandles.length ? Math.max(...dayCandles.map((candle) => candle.high)) : null
  const dayLow = dayCandles.length ? Math.min(...dayCandles.map((candle) => candle.low)) : null
  const dayVolume = dayCandles.reduce((total, candle) => total + candle.volume, 0)
  const latestCandle = candles[candles.length - 1]

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  function updatePercent(value: number) {
    setPercent(value)
    const balance = side === 'Buy' ? quoteBalance : baseBalance
    const referencePrice = Number(price) || currentPrice
    const availableQuantity = side === 'Buy' ? (referencePrice ? balance / referencePrice : 0) : balance
    setQuantity(value ? (availableQuantity * value / 100).toFixed(4) : '0')
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    let active = true
    apiRequest<{ user: AuthUser }>('/auth/me')
      .then(({ user: verifiedUser }) => { if (active) setUser(verifiedUser) })
      .catch((error: unknown) => {
        if (!active) return
        setToken(null)
        setUser(null)
        setAccessToken(null)
        setNotice(error instanceof Error ? error.message : 'Your session expired. Please log in again.')
      })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    let active = true
    setMarketError('')
    Promise.all([
      apiRequest<CandleResponse>(`/market/${market}/candles?interval=1h&limit=240`),
      apiRequest<{ trades: Omit<MarketTrade, 'type' | 'side'>[] }>(`/market/${market}/trades?limit=50`),
      apiRequest<DepthResponse>(`/depth/${market}`)
    ]).then(([candleResponse, tradeResponse, depth]) => {
      if (!active) return
      setCandles(candleResponse.candles ?? [])
      setTrades(tradeResponse.trades.map((trade) => ({ ...trade, type: 'TRADE_UPDATE' })))
      setAsks(makeBookRows((depth.asks ?? []).slice().sort((a, b) => a.price - b.price)))
      setBids(makeBookRows((depth.bids ?? []).slice().sort((a, b) => b.price - a.price)))
    }).catch((error: unknown) => {
      if (active) setMarketError(error instanceof Error ? error.message : 'Market data is unavailable')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let stopped = false
    let socket: WebSocket | null = null
    let reconnectTimer = 0
    let attempt = 0

    const connect = () => {
      if (stopped) return
      socket = new WebSocket(marketSocketUrl)
      socket.onopen = () => {
        attempt = 0
        setMarketConnected(true)
        socket?.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: [`market:depth:${market}`, `market:trades:${market}`]
        }))
      }
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as DepthMessage | MarketTrade
          if (message.market !== market) return
          if (message.type === 'DEPTH_UPDATE') {
            const depth = message as DepthMessage
            setAsks(makeBookRows(depth.asks.slice().sort((a, b) => a.price - b.price)))
            setBids(makeBookRows(depth.bids.slice().sort((a, b) => b.price - a.price)))
          } else if (message.type === 'TRADE_UPDATE') {
            const trade = message as MarketTrade
            setTrades((current) => [trade, ...current.filter((previous) => previous.id !== trade.id)].slice(0, 50))
            const bucket = Math.floor(trade.t / 3_600_000) * 3_600_000
            setCandles((current) => {
              const index = current.findIndex((candle) => candle.t === bucket)
              if (index < 0) {
                return [...current, { t: bucket, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: trade.quantity }].slice(-500)
              }
              return current.map((candle, candleIndex) => candleIndex === index
                ? { ...candle, high: Math.max(candle.high, trade.price), low: Math.min(candle.low, trade.price), close: trade.price, volume: candle.volume + trade.quantity }
                : candle)
            })
          }
        } catch (error) {
          console.error('Unable to process market stream update', error)
        }
      }
      socket.onclose = () => {
        setMarketConnected(false)
        if (!stopped) {
          const delay = Math.min(1000 * 2 ** attempt, 15_000)
          attempt += 1
          reconnectTimer = window.setTimeout(connect, delay)
        }
      }
      socket.onerror = () => socket?.close()
    }

    connect()
    return () => {
      stopped = true
      window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setBalances([])
      setOrders([])
      return
    }
    let active = true
    const refreshAccount = async () => {
      try {
        const [balanceResponse, orderResponse] = await Promise.all([
          apiRequest<{ balances: ApiBalance[] }>('/balance'),
          apiRequest<{ orders: ApiOrder[] }>('/orders')
        ])
        if (active) {
          setBalances(balanceResponse.balances)
          setOrders(orderResponse.orders)
          setAccountError('')
        }
      } catch (error) {
        if (active) setAccountError(error instanceof Error ? error.message : 'Unable to load account data')
      }
    }
    void refreshAccount()
    const timer = window.setInterval(() => void refreshAccount(), 5_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [user])

  async function placeOrder() {
    if (!user) {
      setAuthMode('signin')
      return
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0 || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      setNotice('Enter a valid price and quantity.')
      return
    }
    setOrderSubmitting(true)
    try {
      const result = await apiRequest<{ orderId: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({ market, side: side.toUpperCase(), quantity: Number(quantity), price: Number(price) })
      })
      setNotice('Limit order submitted.')
      const response = await apiRequest<{ orders: ApiOrder[] }>('/orders')
      setOrders(response.orders)
      if (!response.orders.some((order) => order.id === result.orderId)) {
        setOrders((current) => [{
          id: result.orderId, market, side: side.toUpperCase() as ApiOrder['side'], price: Number(price),
          quantity: Number(quantity), filled: 0, status: 'OPEN', createdAt: new Date().toISOString()
        }, ...current])
      }
      const balanceResponse = await apiRequest<{ balances: ApiBalance[] }>('/balance')
      setBalances(balanceResponse.balances)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to submit limit order.')
    } finally {
      setOrderSubmitting(false)
    }
  }

  async function cancelOrder(orderId: string) {
    try {
      await apiRequest(`/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' })
      setOrders((current) => current.filter((order) => order.id !== orderId))
      setNotice('Order cancelled.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to cancel order.')
    }
  }

  return (
    <div className="exchange-app">
      <aside className="exchange-sidebar">
        <a className="exchange-brand" href="/trade" aria-label="Backpack home">
          <span className="brand-bag">▣</span>
          <span>Backpack</span>
        </a>
        <nav className="exchange-nav" aria-label="Main navigation">
          <a className="exchange-nav-item" href="/trade"><Home size={17} />Home</a>
          <a className="exchange-nav-item selected" href="/trade"><CandlestickChart size={17} />Trade<ChevronDown className="nav-chevron" size={14} /></a>
          <button className={`exchange-nav-item sidebar-panel-trigger${sidebarPanel === 'balances' ? ' selected' : ''}`} type="button" aria-expanded={sidebarPanel === 'balances'} onClick={() => setSidebarPanel(sidebarPanel === 'balances' ? null : 'balances')}><WalletCards size={17} />Balance</button>
          <button className={`exchange-nav-item sidebar-panel-trigger${sidebarPanel === 'orders' ? ' selected' : ''}`} type="button" aria-expanded={sidebarPanel === 'orders'} onClick={() => setSidebarPanel(sidebarPanel === 'orders' ? null : 'orders')}><ClipboardList size={17} />Orders</button>
          <button className="exchange-nav-item" type="button"><WalletCards size={17} />Lend</button>
          <button className="exchange-nav-item" type="button"><Activity size={17} />BP</button>
          <button className="exchange-nav-item" type="button"><Layers3 size={17} />Tools<ChevronDown className="nav-chevron" size={14} /></button>
          <button className="exchange-nav-item" type="button"><MoreHorizontal size={17} />More</button>
        </nav>
        <div className="exchange-sidebar-bottom">
          <button className="exchange-nav-item collapse-item" type="button"><ChevronRight size={16} />Collapse</button>
          <button className="exchange-nav-item" type="button"><CircleHelp size={17} />Support<ArrowUpRight className="nav-external" size={13} /></button>
        </div>
      </aside>

      {sidebarPanel && (
        <aside className="sidebar-detail-panel" aria-label={sidebarPanel === 'balances' ? 'Balances' : 'Orders'}>
          <header className="sidebar-detail-header">
            <div>
              <strong>{sidebarPanel === 'balances' ? 'Balances' : 'Open Orders'}</strong>
              <span>{user?.email ?? 'Log in to view your account'}</span>
            </div>
            <button type="button" aria-label="Close sidebar panel" onClick={() => setSidebarPanel(null)}><X size={16} /></button>
          </header>
          {sidebarPanel === 'balances' ? (
            <div className="sidebar-balance-list">
              {!user ? <div className="sidebar-empty">{accountError || 'Log in to view balances.'}</div> : balances.length ? balances.map((asset) => (
                <div className="sidebar-balance-row" key={asset.asset}>
                  <div><strong>{asset.asset}</strong><span>Available {format(Number(asset.available), 4)}</span></div>
                  <div><strong>{format(Number(asset.available) + Number(asset.locked), 4)}</strong><span>Locked {format(Number(asset.locked), 4)}</span></div>
                </div>
              )) : <div className="sidebar-empty">{accountError || 'No balances found.'}</div>}
            </div>
          ) : (
            <div className="sidebar-order-list">
              {!user ? <div className="sidebar-empty">{accountError || 'Log in to view your orders.'}</div> : openOrders.length ? openOrders.map((order) => (
                <div className="sidebar-order-row" key={order.id}>
                  <div><strong className={order.side === 'BUY' ? 'positive-text' : 'negative-text'}>{order.side} {order.market.replace('_', '/')}</strong><span>Limit · {order.status}</span></div>
                  <div><strong>{format(order.quantity, 4)}</strong><span>@ {format(order.price)}</span><button type="button" onClick={() => void cancelOrder(order.id)}>Cancel</button></div>
                </div>
              )) : <div className="sidebar-empty">{accountError || 'No open orders.'}</div>}
            </div>
          )}
        </aside>
      )}

      <div className="exchange-main">
        <header className="exchange-topbar">
          <label className="exchange-search">
            <Search size={15} />
            <input aria-label="Search markets" placeholder="Search markets, stocks, and more" value={search} onChange={(event) => setSearch(event.target.value)} />
            <kbd>/</kbd>
          </label>
          <div className="topbar-actions">
            <button className="icon-action" aria-label="Theme"><Sun size={17} /></button>
            <button className="icon-action" aria-label="Language"><Globe size={17} /></button>
            {user ? (
              <>
                <span className="signed-in-email">{user.email}</span>
                <button className="login-button" type="button" onClick={() => { setAccessToken(null); setToken(null); setUser(null); setNotice('Logged out.') }}>Log out</button>
              </>
            ) : (
              <>
                <button className="login-button" type="button" onClick={() => setAuthMode('signin')}>Log in</button>
                <button className="signup-button" type="button" onClick={() => setAuthMode('signup')}>Sign up</button>
              </>
            )}
          </div>
        </header>

        <div className="exchange-layout">
          <main className="exchange-left">
            <section className="market-summary">
              <div className="market-pair">
                <span className="solana-mark"><i /><i /><i /></span>
                <strong>SOL/USDC</strong>
                <ChevronDown size={16} className="muted-icon" />
              </div>
              <strong className="market-last-price">{currentPrice == null ? '—' : format(currentPrice)}</strong>
              <div className="market-stat"><span>24H Change</span><b className={dayChange == null ? '' : dayChange >= 0 ? 'up-text' : 'down-text'}>{dayChange == null ? '—' : `${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}%`}</b></div>
              <div className="market-stat"><span>24H High</span><b>{dayHigh == null ? '—' : format(dayHigh)}</b></div>
              <div className="market-stat"><span>24H Low</span><b>{dayLow == null ? '—' : format(dayLow)}</b></div>
              <div className="market-stat volume-stat"><span>24H Volume (SOL)</span><b>{dayVolume ? format(dayVolume, 2) : '—'}</b></div>
            </section>

            <div className="exchange-board">
              <section className="chart-card">
                <div className="chart-tabs-row">
                  <div className="chart-tabs">
                    <button className="exchange-tab active" type="button">Chart</button>
                    <button className="exchange-tab" type="button" onClick={() => setNotice('Depth chart is coming soon.')}>Depth</button>
                    <button className="exchange-tab" type="button" onClick={() => setNotice('Margin panel is coming soon.')}>Margin</button>
                    <button className="exchange-tab" type="button" onClick={() => setNotice('Market info is coming soon.')}>Market Info</button>
                  </div>
                </div>
                <div className="chart-tools">
                  <button type="button">1h</button><span className="tool-divider" />
                  <button type="button"><CandlestickChart size={15} /></button><span className="tool-divider" />
                  <button type="button"><SlidersHorizontal size={15} /> Indicators</button>
                  <button className="tool-accent" type="button">OL</button>
                  <button className="tool-accent" type="button">TE</button>
                  <button className="undo-tool" type="button" aria-label="Undo">↶</button>
                  <div className="tools-spacer" />
                  <button type="button" aria-label="Chart settings"><Settings2 size={16} /></button>
                  <button type="button" aria-label="Fullscreen">⛶</button>
                  <button type="button" aria-label="Screenshot">▧</button>
                  <button className="reset-tool" type="button">Reset</button>
                </div>
                <div className="chart-body">
                  <div className="chart-instrument-title"><span>SOL/USDC · 1h</span><i className={marketConnected ? 'is-connected' : ''} /><span>{marketConnected ? 'Live stream' : marketError || 'Connecting to market stream…'}</span>{latestCandle && <><span>O <b>{format(latestCandle.open)}</b></span><span>H <b>{format(latestCandle.high)}</b></span><span>L <b>{format(latestCandle.low)}</b></span><span>C <b>{format(latestCandle.close)}</b></span></>}</div>
                  <MarketChart data={candles} symbol="SOL/USDC" name="Solana" height={460} chartRange={chartRange} loading={!candles.length && !marketError} live={marketConnected} />
                  <div className="chart-bottom-tools">
                    <div className="range-shortcuts">
                      {['All', '1y', '6m', '3m', '1m', '5d', '1d'].map((range) => <button key={range} type="button" className={chartRange === range ? 'active' : ''} onClick={() => setChartRange(range)}>{range}</button>)}
                      <button type="button" aria-label="Calendar">▣</button>
                    </div>
                    <div className="chart-clock">{clock.toLocaleTimeString('en-GB', { timeZone: 'UTC' })} (UTC)&nbsp;&nbsp; <span>%</span>&nbsp; log&nbsp; <b>auto</b></div>
                  </div>
                </div>
              </section>

              <section className="book-card">
                <div className="book-tabs">
                  <button className={marketTab === 'Book' ? 'active' : ''} type="button" onClick={() => setMarketTab('Book')}>Book</button>
                  <button className={marketTab === 'Trades' ? 'active' : ''} type="button" onClick={() => setMarketTab('Trades')}>Trades</button>
                </div>
                {marketTab === 'Book' ? (
                  <>
                    <div className="book-tools">
                      <span className="book-view-options"><i>☷</i><i>▥</i><i>☷</i><LockKeyhole size={13} /></span>
                      <span className="book-step">− &nbsp; .01 &nbsp; <b>＋</b></span>
                    </div>
                    <div className="book-column-head"><span>Price (USDC)</span><span>Size (SOL)</span><span>Total (SOL)</span></div>
                    <div className="book-rows">
                      {asks.slice().reverse().map((row) => <BookLine key={row.price} row={row} type="ask" />)}
                    </div>
                    <div className="book-mid-price"><strong>{currentPrice == null ? '—' : format(currentPrice)}</strong><span>⌄</span></div>
                    <div className="book-rows">
                      {bids.map((row) => <BookLine key={row.price} row={row} type="bid" />)}
                    </div>
                    {(asks.length === 0 && bids.length === 0) && <span className="book-empty">{marketError || 'Waiting for order book data…'}</span>}
                    <div className="book-depth-bar"><span>{bidDepthPercent}%</span><i style={{ background: `linear-gradient(110deg, rgba(0,153,107,.25) 0 ${bidDepthPercent}%, rgba(194,47,58,.28) ${bidDepthPercent}% 100%)` }} /><b>{100 - bidDepthPercent}%</b></div>
                  </>
                ) : (
                  <div className="trades-view">
                    <div className="book-column-head"><span>Price (USDC)</span><span>Size (SOL)</span><span>Time</span></div>
                    {trades.map((trade) => <div className={`trade-line ${trade.side === 'BUY' ? 'up' : trade.side === 'SELL' ? 'down' : 'neutral'}`} key={trade.id}><b>{format(trade.price)}</b><span>{format(trade.quantity, 4)}</span><span>{new Date(trade.t).toLocaleTimeString()}</span></div>)}
                    {trades.length === 0 && <span className="book-empty">No recent trades.</span>}
                  </div>
                )}
              </section>
            </div>

          </main>

          <aside className="exchange-rail">
            <section className="order-entry">
              <div className="buy-sell-toggle">
                <button className={side === 'Buy' ? 'buy active' : ''} type="button" onClick={() => { setSide('Buy'); setPercent(0) }}>Buy</button>
                <button className={side === 'Sell' ? 'sell active' : ''} type="button" onClick={() => { setSide('Sell'); setPercent(0) }}>Sell</button>
              </div>
              <div className="order-type-tabs">
                <span className="order-type-selected">Limit</span>
              </div>
              <div className="order-balance">Balance <span>{user ? `${format(side === 'Buy' ? quoteBalance : baseBalance, 4)} ${side === 'Buy' ? 'USDC' : 'SOL'}` : 'Log in to view'}</span></div>
              <label className="input-caption">Price <button type="button" disabled={currentPrice == null} onClick={() => { if (currentPrice != null) setPrice(String(currentPrice)) }}>Mid&nbsp; <span>BBO</span></button></label>
              <div className="order-input">
                <input aria-label="Price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
                <span className="dollar-chip">$</span>
              </div>
              <label className="input-caption quantity-caption">Quantity <span>SOL</span></label>
              <div className="order-input">
                <input aria-label="Quantity" type="number" value={quantity} onChange={(event) => { setQuantity(event.target.value); setPercent(0) }} min="0" step="0.01" />
                <span className="solana-mark small"><i /><i /><i /></span>
              </div>
              <div className="allocation-slider">
                <input aria-label="Order size percentage" type="range" min="0" max="100" step="25" value={percent} onChange={(event) => updatePercent(Number(event.target.value))} />
                <div className="slider-marks">{[0, 25, 50, 75, 100].map((mark) => <button key={mark} type="button" aria-label={`${mark}%`} onClick={() => updatePercent(mark)} className={percent >= mark && mark > 0 ? 'reached' : ''} />)}</div>
                <span>{percent}%</span>
              </div>
              <label className="input-caption value-caption">Order Value</label>
              <div className="order-input value-input">
                <span>{format(orderValue, 2)}</span>
                <span className="dollar-chip">$</span>
              </div>
              <button className={`trade-cta ${side === 'Buy' ? 'signup-cta' : 'sell-cta'}`} type="button" disabled={orderSubmitting} onClick={() => void placeOrder()}>{orderSubmitting ? 'Submitting…' : user ? `${side} SOL` : 'Log in to trade'}</button>
            </section>
          </aside>
        </div>
      </div>

      {notice && <div className="exchange-notice" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
      {authMode && <AuthDialog initialMode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={(result) => {
        setAccessToken(result.token)
        setToken(result.token)
        setUser(result.user)
        setAuthMode(null)
        setNotice(result.message ?? 'Signed in successfully.')
      }} />}
    </div>
  )
}

function BookLine({ row, type }: { row: BookRow; type: 'ask' | 'bid' }) {
  const width = Math.min(100, (row.total / (type === 'ask' ? 900 : 750)) * 100)
  return <div className={`book-line ${type}`}>
    <div className="book-depth-fill" style={{ width: `${width}%` }} />
    <span>{format(row.price)}</span><span>{format(row.size, 2)}</span><span>{format(row.total, 2)}</span>
  </div>
}
