import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  CandlestickChart,
  ChevronDown,
  ChevronRight,
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
import { MarketChart, type MarketChartCandle } from '../components/trading/MarketChart'

type BookRow = { price: number; size: number; total: number }
type AccountTab = 'Balances' | 'Positions' | 'Open Orders' | 'Borrows' | 'TWAP' | 'Fill History' | 'Order History' | 'Position History' | 'Funding History'

const currentPrice = 103.81
const asks: BookRow[] = [
  { price: 103.82, size: 129.74, total: 883.5 },
  { price: 103.81, size: 50.74, total: 754.03 },
  { price: 103.80, size: 96.39, total: 703.29 },
  { price: 103.79, size: 60.63, total: 606.9 },
  { price: 103.78, size: 90.19, total: 546.27 },
  { price: 103.77, size: 78.6, total: 456.08 },
  { price: 103.76, size: 20.16, total: 377.48 },
  { price: 103.75, size: 156.83, total: 357.32 },
  { price: 103.74, size: 112.51, total: 200.49 },
  { price: 103.73, size: 87.98, total: 87.98 },
]
const bids: BookRow[] = [
  { price: 103.72, size: 32.21, total: 32.21 },
  { price: 103.71, size: 119.38, total: 151.59 },
  { price: 103.70, size: 138.51, total: 290.1 },
  { price: 103.69, size: 191.28, total: 481.38 },
  { price: 103.68, size: 86.75, total: 568.13 },
  { price: 103.67, size: 53.86, total: 621.99 },
  { price: 103.66, size: 86.75, total: 708.74 },
  { price: 103.65, size: 0.98, total: 709.72 },
  { price: 103.64, size: 24.09, total: 733.81 },
  { price: 103.63, size: 3.92, total: 737.73 },
]

const accountTabs: AccountTab[] = ['Balances', 'Positions', 'Open Orders', 'Borrows', 'TWAP', 'Fill History', 'Order History', 'Position History', 'Funding History']

function createDemoCandles(): MarketChartCandle[] {
  const anchors = [
    [0, 108.1], [9, 109.4], [18, 109.9], [27, 109.1], [36, 110.5],
    [46, 109.4], [55, 110.1], [63, 109.6], [70, 110.0], [77, 112.0],
    [82, 111.2], [88, 112.7], [93, 110.8], [98, 109.3], [102, 107.9],
    [106, 107.1], [109, 103.0], [113, 106.2], [116, 107.8], [118, 106.8], [119, currentPrice],
  ] as const

  return Array.from({ length: 120 }, (_, index) => {
    const section = anchors.findIndex(([anchorIndex]) => anchorIndex >= index)
    const nextAnchor = anchors[Math.max(section, 0)]
    const previousAnchor = anchors[Math.max(section - 1, 0)]
    const progress = nextAnchor[0] === previousAnchor[0] ? 0 : (index - previousAnchor[0]) / (nextAnchor[0] - previousAnchor[0])
    const baseline = previousAnchor[1] + (nextAnchor[1] - previousAnchor[1]) * progress
    const close = index === 119 ? currentPrice : baseline + Math.sin(index * 1.71) * 0.36 + Math.sin(index * 0.47) * 0.18
    const previousClose = index === 0 ? close - 0.25 : (() => {
      const previousSection = anchors.findIndex(([anchorIndex]) => anchorIndex >= index - 1)
      const next = anchors[Math.max(previousSection, 0)]
      const previous = anchors[Math.max(previousSection - 1, 0)]
      const previousProgress = next[0] === previous[0] ? 0 : (index - 1 - previous[0]) / (next[0] - previous[0])
      return previous[1] + (next[1] - previous[1]) * previousProgress + Math.sin((index - 1) * 1.71) * 0.36 + Math.sin((index - 1) * 0.47) * 0.18
    })()
    const open = index === 119 ? previousClose + 0.5 : previousClose + Math.sin(index * 2.31) * 0.24
    const wick = 0.12 + (Math.sin(index * 1.27) + 1) * 0.17
    const spike = [44, 77, 102, 109, 112].includes(index) ? 1300 : 0
    const volume = 1050 + Math.abs(Math.sin(index * 2.8)) * 1500 + spike

    return {
      t: Date.UTC(2025, 3, 9, 0) + index * 3 * 60 * 60 * 1000,
      open,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick * 1.12,
      close,
      volume,
    }
  })
}

const demoCandles = createDemoCandles()
const format = (value: number, digits = 2) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export default function TradingPage() {
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy')
  const [orderType, setOrderType] = useState<'Limit' | 'Market' | 'Conditional'>('Limit')
  const [price, setPrice] = useState(String(currentPrice))
  const [quantity, setQuantity] = useState('0')
  const [percent, setPercent] = useState(0)
  const [accountTab, setAccountTab] = useState<AccountTab>('Borrows')
  const [marketTab, setMarketTab] = useState<'Book' | 'Trades'>('Book')
  const [chartRange, setChartRange] = useState('All')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  const orderValue = useMemo(() => Number(price || 0) * Number(quantity || 0), [price, quantity])

  function updatePercent(value: number) {
    setPercent(value)
    setQuantity(value ? ((100 * value / 100) / Number(price || currentPrice)).toFixed(4) : '0')
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
            <button className="login-button" type="button" onClick={() => setNotice('Log in is a demo-only action.')}>Log in</button>
            <button className="signup-button" type="button" onClick={() => setNotice('Sign up is a demo-only action.')}>Sign up</button>
          </div>
        </header>

        <div className="exchange-layout">
          <main className="exchange-left">
            <section className="market-summary">
              <div className="market-pair">
                <span className="solana-mark"><i /><i /><i /></span>
                <strong>SOL/USD</strong>
                <span className="leverage-chip">8x</span>
                <ChevronDown size={16} className="muted-icon" />
              </div>
              <strong className="market-last-price">{format(currentPrice)}</strong>
              <div className="market-stat"><span>24H Change</span><b className="down-text">-4.18&nbsp; -3.87%</b></div>
              <div className="market-stat"><span>24H High</span><b>108.54</b></div>
              <div className="market-stat"><span>24H Low</span><b>103.45</b></div>
              <div className="market-stat volume-stat"><span>24H Volume (USD)</span><b>1,036,728.20</b></div>
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
                  <div className="chart-instrument-title"><span>SOL/USD · 1h · Backpack</span><i /><span>O <b>104.76</b></span><span>H <b>105.02</b></span><span>L <b>103.45</b></span><span>C <b>103.81</b></span><strong>-1.10 (-1.05%)</strong></div>
                  <MarketChart data={demoCandles} symbol="" name="" height={460} chartRange={chartRange} />
                  <div className="chart-bottom-tools">
                    <div className="range-shortcuts">
                      {['All', '1y', '6m', '3m', '1m', '5d', '1d'].map((range) => <button key={range} type="button" className={chartRange === range ? 'active' : ''} onClick={() => setChartRange(range)}>{range}</button>)}
                      <button type="button" aria-label="Calendar">▣</button>
                    </div>
                    <div className="chart-clock">14:49:30 (UTC)&nbsp;&nbsp; <span>%</span>&nbsp; log&nbsp; <b>auto</b></div>
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
                    <div className="book-column-head"><span>Price (USD)</span><span>Size (SOL)</span><span>Total (SOL)</span></div>
                    <div className="book-rows">
                      {asks.slice().reverse().map((row) => <BookLine key={row.price} row={row} type="ask" />)}
                    </div>
                    <div className="book-mid-price"><strong>{format(currentPrice)}</strong><span>⌄</span></div>
                    <div className="book-rows">
                      {bids.map((row) => <BookLine key={row.price} row={row} type="bid" />)}
                    </div>
                    <div className="book-depth-bar"><span>41%</span><i /><b>59%</b></div>
                  </>
                ) : (
                  <div className="trades-view">
                    <div className="book-column-head"><span>Price (USD)</span><span>Size (SOL)</span><span>Time</span></div>
                    {[['103.81', '12.40', '14:49:30'], ['103.79', '5.18', '14:49:28'], ['103.83', '1.62', '14:49:21'], ['103.80', '24.06', '14:49:18'], ['103.82', '7.51', '14:49:12']].map((row, index) => <div className={`trade-line ${index % 2 ? 'up' : 'down'}`} key={`${row[0]}-${row[2]}`}><b>{row[0]}</b><span>{row[1]}</span><span>{row[2]}</span></div>)}
                  </div>
                )}
              </section>
            </div>

            <section className="account-card">
              <div className="account-tabs">
                {accountTabs.map((tab) => <button key={tab} type="button" className={accountTab === tab ? 'active' : ''} onClick={() => setAccountTab(tab)}>{tab}</button>)}
                <button className="account-history-link" type="button" onClick={() => setAccountTab('Order History')}>Borrow history <ChevronRight size={14} /></button>
              </div>
              <div className="account-empty">
                {accountTab === 'Borrows' ? null : <span>{accountTab} will appear here when you connect an account.</span>}
              </div>
            </section>
          </main>

          <aside className="exchange-rail">
            <section className="order-entry">
              <div className="buy-sell-toggle">
                <button className={side === 'Buy' ? 'buy active' : ''} type="button" onClick={() => setSide('Buy')}>Buy</button>
                <button className={side === 'Sell' ? 'sell active' : ''} type="button" onClick={() => setSide('Sell')}>Sell</button>
              </div>
              <div className="order-type-tabs">
                {(['Limit', 'Market', 'Conditional'] as const).map((type) => <button key={type} className={orderType === type ? 'active' : ''} type="button" onClick={() => setOrderType(type)}>{type}{type === 'Conditional' && <ChevronDown size={14} />}</button>)}
              </div>
              <div className="order-balance">Balance <span>{side === 'Buy' ? '— USDC' : '— SOL'}</span></div>
              <label className="input-caption">Price <button type="button" onClick={() => setPrice(String(currentPrice))}>Mid&nbsp; <span>BBO</span></button></label>
              <div className="order-input">
                <input aria-label="Price" type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
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
              <button className="trade-cta signup-cta" type="button" onClick={() => setNotice('Create an account to place live orders.')}>Sign up to trade</button>
              <button className="trade-cta login-cta" type="button" onClick={() => setNotice('Log in to connect your account.')}>Log in to trade</button>
              <div className="order-options"><label><input type="checkbox" /> Post Only</label><label><input type="checkbox" /> IOC</label></div>
            </section>
            <button className="perp-card" type="button" onClick={() => setNotice('SOL-PERP demo market selected.')}>
              <span className="solana-mark small"><i /><i /><i /></span>
              <span><strong>Trade SOL-PERP <ArrowUpRight size={13} /></strong><small>Long or short SOL with up to <b>50x</b> leverage</small></span>
            </button>
          </aside>
        </div>
      </div>

      {notice && <div className="demo-notice" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
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
