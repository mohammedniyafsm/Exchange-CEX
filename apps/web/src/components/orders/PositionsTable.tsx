import { ArrowRightLeft, MoreHorizontal } from 'lucide-react'
import { formatDollar, formatPercent } from '../../lib/format'
import type { Position } from '../../types'

type Props = { positions: Position[] }

export function PositionsTable({ positions }: Props) {
  if (!positions.length) {
    return <div className="panel p-4 text-sm text-muted">No positions</div>
  }

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted">Open Positions</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-panelAlt text-[10px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Entry Price</th>
              <th className="px-3 py-2">Mark Price</th>
              <th className="px-3 py-2">Liq. Price</th>
              <th className="px-3 py-2">TP</th>
              <th className="px-3 py-2">SL</th>
              <th className="px-3 py-2">Unrealized P&amp;L</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id} className="border-t border-border">
                <td className="px-3 py-3 font-medium text-text">{position.symbol}</td>
                <td className={`px-3 py-3 ${position.side === 'LONG' ? 'text-buy' : 'text-sell'}`}>{position.side}</td>
                <td className="num px-3 py-3 text-text">{position.size} SOL</td>
                <td className="num px-3 py-3 text-text">{formatDollar(position.entryPrice)}</td>
                <td className="num px-3 py-3 text-text">{formatDollar(position.markPrice)}</td>
                <td className="num px-3 py-3 text-text">{formatDollar(position.liquidationPrice)}</td>
                <td className="num px-3 py-3 text-text">{position.tp ? formatDollar(position.tp) : '-'}</td>
                <td className="num px-3 py-3 text-text">{position.sl ? formatDollar(position.sl) : '-'}</td>
                <td className={`num px-3 py-3 ${position.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>{position.pnl >= 0 ? '+' : ''}{formatDollar(position.pnl)}</td>
                <td className="px-3 py-3"><button className="rounded border border-border bg-panelAlt p-1.5 text-muted"><MoreHorizontal size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
