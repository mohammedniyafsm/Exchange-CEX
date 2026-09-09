import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Candle } from '../../types'

type Props = { candles: Candle[]; currentPrice: number }

function CandleShape(props: any) {
  const { x, y, width, height, payload } = props
  const color = payload.close >= payload.open ? '#0ecb81' : '#f6465d'
  const center = x + width / 2
  const bodyHeight = Math.max(height, 2)
  return <g><line x1={center} x2={center} y1={payload.wickTop} y2={payload.wickBottom} stroke={color} strokeWidth={1} /><rect x={x + 1} y={y - (bodyHeight - height) / 2} width={Math.max(width - 2, 2)} height={bodyHeight} fill={color} /></g>
}

export function CandlestickChart({ candles }: Props) {
  const data = candles.map((candle) => ({ ...candle, body: Math.abs(candle.close - candle.open), wickTop: candle.high, wickBottom: candle.low }))
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 12, right: 56, bottom: 6, left: 0 }}>
    <CartesianGrid stroke="#20252c" strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="time" tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} minTickGap={44} stroke="#5f6670" tick={{ fill: '#8b929c', fontSize: 10 }} />
    <YAxis domain={['dataMin - 1', 'dataMax + 1']} orientation="right" tickFormatter={(value) => `$${Number(value).toFixed(2)}`} stroke="#5f6670" tick={{ fill: '#8b929c', fontSize: 10 }} width={54} />
    <Tooltip contentStyle={{ background: '#161a1e', border: '1px solid #2b3139', color: '#f0f3f6', fontSize: 12 }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']} />
    <Bar dataKey="body" shape={<CandleShape />} isAnimationActive={false} />
  </ComposedChart></ResponsiveContainer></div>
}
