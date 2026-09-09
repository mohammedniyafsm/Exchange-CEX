import type { OrderBookEntry } from '../../types'

type Props = {
  asks: OrderBookEntry[]
  bids: OrderBookEntry[]
  spread: number
}

export function OrderBook({ asks, bids, spread }: Props) {
  const maxAsk = Math.max(...asks.map((row) => row.total), 1)
  const maxBid = Math.max(...bids.map((row) => row.total), 1)

  return (
    <div className="panel h-full overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Order Book</div>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-[1fr_0.7fr_0.8fr] gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
          <span>Price</span>
          <span>Size</span>
          <span>Total</span>
        </div>

        <div className="space-y-1">
          {asks.slice().reverse().map((row) => (
            <div key={`ask-${row.price}`} className="relative">
              <div className="absolute inset-y-0 right-0 z-0 rounded bg-sell/10" style={{ width: `${(row.total / maxAsk) * 100}%` }} />
              <div className="relative z-10 grid grid-cols-[1fr_0.7fr_0.8fr] gap-2 text-[12px] text-sell">
                <span className="num">{row.price.toFixed(2)}</span>
                <span className="num text-right">{row.size.toFixed(2)}</span>
                <span className="num text-right">{row.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center border-y border-border py-2 text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Spread</span>
          <span className="num ml-2 text-text">${spread.toFixed(2)}</span>
        </div>

        <div className="space-y-1">
          {bids.slice().reverse().map((row) => (
            <div key={`bid-${row.price}`} className="relative">
              <div className="absolute inset-y-0 left-0 z-0 rounded bg-buy/10" style={{ width: `${(row.total / maxBid) * 100}%` }} />
              <div className="relative z-10 grid grid-cols-[1fr_0.7fr_0.8fr] gap-2 text-[12px] text-buy">
                <span className="num">{row.price.toFixed(2)}</span>
                <span className="num text-right">{row.size.toFixed(2)}</span>
                <span className="num text-right">{row.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
