import type { Timeframe } from '../../types'

type Props = {
  value: Timeframe
  onChange: (value: Timeframe) => void
}

const options: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D']

export function ChartToolbar({ value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between border-b-2 border-[#e8e8e8] px-4 py-2">
      <div className="flex items-center gap-1 border-2 border-[#e8e8e8] bg-panelAlt p-1">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition ${
              value === option ? 'bg-panel border border-[#e8e8e8] text-text' : 'text-muted hover:text-text'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
        <button className="border-2 border-[#e8e8e8] bg-panelAlt px-2 py-1">MA</button>
        <button className="border-2 border-[#e8e8e8] bg-panelAlt px-2 py-1">EMA</button>
        <button className="border-2 border-[#e8e8e8] bg-panelAlt px-2 py-1">RSI</button>
        <button className="border-2 border-[#e8e8e8] bg-panelAlt px-2 py-1">MACD</button>
      </div>
    </div>
  )
}
