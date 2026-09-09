import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { formatPercent } from '../../lib/format'
import type { Market, SymbolPair } from '../../types'

type Props = {
  markets: Market[]
  selected: SymbolPair
  onSelect: (symbol: SymbolPair) => void
  query: string
  onQueryChange: (value: string) => void
}

export function MarketSidebar({ markets, selected, onSelect, query, onQueryChange }: Props) {
  const filteredMarkets = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return markets
    return markets.filter((market) => market.symbol.toLowerCase().includes(q))
  }, [markets, query])

  return (
    <aside className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-[#e8e8e8] px-3 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Markets</div>
        <div className="flex gap-1 border-2 border-[#e8e8e8] bg-panelAlt p-1 text-[10px] uppercase tracking-[0.12em] text-muted">
          <button className="tab-btn tab-btn-active">Fav</button>
          <button className="tab-btn">Spot</button>
          <button className="tab-btn">Fut</button>
        </div>
      </div>

      <div className="border-b-2 border-[#e8e8e8] p-3">
        <label className="flex items-center gap-2 border-2 border-[#e8e8e8] bg-panelAlt px-2 py-2 text-muted shadow-[2px_2px_0_rgba(0,0,0,0.45)]">
          <Search size={14} />
          <input
            aria-label="Search markets"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search markets..."
            className="w-full bg-transparent text-xs text-text placeholder:text-subtle focus:outline-none"
          />
        </label>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredMarkets.length ? (
          filteredMarkets.map((market) => {
            const positive = market.change24h >= 0
            return (
              <button
                key={market.symbol}
                onClick={() => onSelect(market.symbol)}
                className={`flex w-full items-center justify-between gap-3 border-b-2 border-[#e8e8e8] px-3 py-3 text-left transition ${
                  selected === market.symbol ? 'bg-primary/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]' : 'hover:bg-panelAlt'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-text">{market.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="num text-xs text-text">${market.last.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div className={`text-[11px] ${positive ? 'text-buy' : 'text-sell'}`}>{formatPercent(market.change24h)}</div>
                </div>
              </button>
            )
          })
        ) : (
          <div className="p-4 text-xs text-muted">No markets found</div>
        )}
      </div>
    </aside>
  )
}
