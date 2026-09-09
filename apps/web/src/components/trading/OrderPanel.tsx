import { useMemo, useState } from 'react'
import { formatDollar } from '../../lib/format'
import type { OrderSide, OrderType, SymbolPair } from '../../types'

type Props = {
  symbol: SymbolPair
  side: OrderSide
  setSide: (side: OrderSide) => void
  orderType: OrderType
  setOrderType: (orderType: OrderType) => void
  amount: string
  setAmount: (v: string) => void
  price: string
  setPrice: (v: string) => void
  leverage: number
  setLeverage: (v: number) => void
  tpEnabled: boolean
  setTpEnabled: (v: boolean) => void
  slEnabled: boolean
  setSlEnabled: (v: boolean) => void
  tpTarget: string
  setTpTarget: (v: string) => void
  slTarget: string
  setSlTarget: (v: string) => void
  onSubmit: () => void
  marketPrice: number
}

const leverageOptions = [1, 2, 5, 10, 20]

export function OrderPanel({
  symbol,
  side,
  setSide,
  orderType,
  setOrderType,
  amount,
  setAmount,
  price,
  setPrice,
  leverage,
  setLeverage,
  tpEnabled,
  setTpEnabled,
  slEnabled,
  setSlEnabled,
  tpTarget,
  setTpTarget,
  slTarget,
  setSlTarget,
  onSubmit,
  marketPrice
}: Props) {
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY')
  const cost = useMemo(() => {
    const quantity = Number(amount || 0)
    const estimate = Number(price || marketPrice || 0) * quantity
    return Number.isFinite(estimate) ? estimate : 0
  }, [amount, marketPrice, price])
  const fee = cost * 0.005
  const total = cost + fee
  const isBuy = side === 'BUY'

  return (
    <aside className="panel h-full overflow-hidden">
      <div className="flex border-b border-border bg-panelAlt/90">
        {(['BUY', 'SELL'] as OrderSide[]).map((option) => (
          <button
            key={option}
            className={`flex-1 border-r-2 border-[#e8e8e8] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              side === option ? (option === 'BUY' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell') : 'text-muted'
            }`}
            onClick={() => setSide(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-3">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">Order Type</div>
          <div className="flex gap-1 border-2 border-[#e8e8e8] bg-panelAlt p-1">
            {(['MARKET', 'LIMIT', 'STOP LIMIT'] as OrderType[]).map((option) => (
              <button
                key={option}
                className={`flex-1 px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] ${
                  orderType === option ? 'bg-panel border border-[#e8e8e8] text-text' : 'text-muted'
                }`}
                onClick={() => setOrderType(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-panelAlt p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-muted">
            <span>Available Balance</span>
            <span className="num text-text">$10,000 USDT</span>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-muted">Price</span>
              <div className="flex items-center border-2 border-[#e8e8e8] bg-panel px-2 py-2 shadow-[2px_2px_0_rgba(0,0,0,0.45)]">
                <input
                  aria-label="Order price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={orderType === 'MARKET' ? 'Market' : 'Limit price'}
                  className="w-full bg-transparent text-sm text-text placeholder:text-subtle focus:outline-none"
                  disabled={orderType === 'MARKET'}
                />
                <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-muted">USDT</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-muted">Amount</span>
              <div className="flex items-center border-2 border-[#e8e8e8] bg-panel px-2 py-2 shadow-[2px_2px_0_rgba(0,0,0,0.45)]">
                <input
                  aria-label="Order amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-sm text-text placeholder:text-subtle focus:outline-none"
                />
                <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-muted">{symbol.split('/')[0]}</span>
              </div>
            </label>

            <div className="grid grid-cols-4 gap-2 text-[10px]">
              {[25, 50, 75, 100].map((pct) => (
                <button key={pct} className="border-2 border-[#e8e8e8] bg-panelAlt px-1.5 py-1.5 text-muted transition hover:text-text">
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-2 border-[#e8e8e8] bg-panelAlt p-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">Leverage</div>
          <div className="flex flex-wrap gap-1">
            {leverageOptions.map((option) => (
              <button
                key={option}
                onClick={() => setLeverage(option)}
                className={`border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                  leverage === option ? 'border-primary bg-primary/10 text-primary' : 'border-[#e8e8e8] bg-panel text-muted'
                }`}
              >
                {option}x
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-muted">Leverage unavailable in Spot</div>
        </div>

        <div className="border-2 border-[#e8e8e8] bg-panelAlt p-3 space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-muted">
            <span>Take Profit</span>
            <button onClick={() => setTpEnabled(!tpEnabled)} className={`border px-2 py-0.5 text-[9px] ${tpEnabled ? 'border-buy/50 bg-buy/10 text-buy' : 'border-[#e8e8e8] text-muted'}`}>
              {tpEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {tpEnabled && (
            <div className="flex items-center border-2 border-[#e8e8e8] bg-panel px-2 py-2">
              <input aria-label="Take profit target" value={tpTarget} onChange={(e) => setTpTarget(e.target.value)} placeholder="205.50" className="w-full bg-transparent text-sm text-text focus:outline-none" />
              <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-muted">USDT</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-muted">
            <span>Stop Loss</span>
            <button onClick={() => setSlEnabled(!slEnabled)} className={`border px-2 py-0.5 text-[9px] ${slEnabled ? 'border-sell/50 bg-sell/10 text-sell' : 'border-[#e8e8e8] text-muted'}`}>
              {slEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {slEnabled && (
            <div className="flex items-center border-2 border-[#e8e8e8] bg-panel px-2 py-2">
              <input aria-label="Stop loss target" value={slTarget} onChange={(e) => setSlTarget(e.target.value)} placeholder="198.00" className="w-full bg-transparent text-sm text-text focus:outline-none" />
              <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-muted">USDT</span>
            </div>
          )}
        </div>

        <div className="border-2 border-[#e8e8e8] bg-panelAlt p-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">Order Summary</div>
          <div className="space-y-2 text-sm text-muted">
            <div className="flex justify-between"><span>Side</span><span className="num text-text">{side}</span></div>
            <div className="flex justify-between"><span>Pair</span><span className="num text-text">{symbol}</span></div>
            <div className="flex justify-between"><span>Type</span><span className="num text-text">{orderType}</span></div>
            <div className="flex justify-between"><span>Amount</span><span className="num text-text">{amount || '0'} {symbol.split('/')[0]}</span></div>
            <div className="flex justify-between"><span>Estimated Price</span><span className="num text-text">{formatDollar(Number(price || marketPrice || 0))}</span></div>
            <div className="flex justify-between"><span>Trading Fee</span><span className="num text-text">{formatDollar(fee)}</span></div>
            <div className="flex justify-between"><span>Total</span><span className="num text-text">{formatDollar(total)}</span></div>
          </div>
        </div>

        <button
          onClick={onSubmit}
          className={`w-full border-2 px-3 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition shadow-[3px_3px_0_rgba(0,0,0,0.5)] ${
            isBuy ? 'border-buy/60 bg-buy text-shell hover:bg-buy/90' : 'border-sell/60 bg-sell text-shell hover:bg-sell/90'
          }`}
        >
          {isBuy ? 'Buy' : 'Sell'} {symbol.split('/')[0]}
        </button>
      </div>
    </aside>
  )
}
