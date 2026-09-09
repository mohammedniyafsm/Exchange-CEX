import { Activity, CircleDot } from 'lucide-react'
import type { Market, SymbolPair } from '../../types'
import { formatDollar, formatPercent } from '../../lib/format'

type Props = {
  symbol: SymbolPair
  market?: Market
}

export function TradingHeader({ symbol, market }: Props) {
  const positive = (market?.change24h ?? 0) >= 0

  return (
    <div className="border-b-2 border-[#e8e8e8] px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold text-text">{symbol}</div>
          <div className="border-2 border-[#e8e8e8] bg-panelAlt px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted">Spot</div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-subtle">Last Price</div>
            <div className="num text-base font-medium text-text">{formatDollar(market?.last ?? 0)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-subtle">24h Change</div>
            <div className={`num text-base font-medium ${positive ? 'text-buy' : 'text-sell'}`}>{formatPercent(market?.change24h ?? 0)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-subtle">24h High</div>
            <div className="num text-base font-medium text-text">{formatDollar(market?.high ?? 0)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-subtle">24h Low</div>
            <div className="num text-base font-medium text-text">{formatDollar(market?.low ?? 0)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-subtle">24h Volume</div>
            <div className="num text-base font-medium text-text">{formatDollar((market?.volume ?? 0) / 1e6)}M</div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-buy">
        <CircleDot size={9} className="fill-current" />
        <span>Live Demo Data</span>
      </div>
    </div>
  )
}
