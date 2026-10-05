import { useRef, useState } from 'react'
import type { Candle } from '../../types'

type Props = { candles: Candle[]; currentPrice: number }

const formatPrice = (value: number) => `$${value.toFixed(2)}`
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function CandlestickChart({ candles, currentPrice }: Props) {
  const safeCandles = candles.length > 0 ? candles : []
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewStart, setViewStart] = useState(0)
  const dragPointerRef = useRef<{ dragging: boolean; startX: number; startView: number }>({ dragging: false, startX: 0, startView: 0 })

  const minVisible = 20
  const maxVisible = Math.max(minVisible, safeCandles.length)
  const targetVisible = clamp(Math.round(safeCandles.length / zoomLevel), minVisible, maxVisible)
  const maxStart = Math.max(0, safeCandles.length - targetVisible)
  const startIndex = clamp(viewStart, 0, maxStart)
  const visibleCandles = safeCandles.slice(startIndex, startIndex + targetVisible)

  const chartHeight = 430
  const chartWidth = 980
  const margin = { top: 10, right: 70, bottom: 30, left: 12 }
  const plotTop = margin.top
  const plotBottom = chartHeight - margin.bottom
  const plotLeft = margin.left
  const plotRight = chartWidth - margin.right

  const chartCandles = visibleCandles.length > 0 ? visibleCandles : safeCandles
  const priceValues = chartCandles.flatMap((candle) => [candle.low, candle.high])
  const minPrice = Math.min(...priceValues, currentPrice)
  const maxPrice = Math.max(...priceValues, currentPrice)
  const priceRange = Math.max(maxPrice - minPrice, 0.0001)
  const paddedMin = minPrice - priceRange * 0.18
  const paddedMax = maxPrice + priceRange * 0.18

  const toY = (price: number) => {
    const ratio = (price - paddedMin) / (paddedMax - paddedMin || 1)
    return plotBottom - ratio * (plotBottom - plotTop)
  }

  const toX = (index: number, total: number) => {
    const step = (plotRight - plotLeft) / Math.max(total - 1, 1)
    return plotLeft + index * step
  }

  const gridLines = Array.from({ length: 6 }, (_, index) => {
    const value = paddedMin + ((paddedMax - paddedMin) / 5) * index
    return { value, y: toY(value) }
  })

  const lastCandle = chartCandles[chartCandles.length - 1] ?? safeCandles[safeCandles.length - 1]
  const lastClose = lastCandle?.close ?? currentPrice
  const priceLineY = toY(lastClose)

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 0.88 : 1.12
    const nextZoom = clamp(zoomLevel * direction, 1, 6)
    const nextVisible = clamp(Math.round(safeCandles.length / nextZoom), minVisible, Math.max(minVisible, safeCandles.length))
    const nextMaxStart = Math.max(0, safeCandles.length - nextVisible)
    const nextStart = clamp(Math.round(viewStart + (event.deltaY < 0 ? -Math.min(6, nextVisible * 0.12) : Math.min(6, nextVisible * 0.12))), 0, nextMaxStart)

    setZoomLevel(nextZoom)
    setViewStart(nextStart)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragPointerRef.current = { dragging: true, startX: event.clientX, startView: viewStart }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragPointerRef.current.dragging) return
    const deltaX = event.clientX - dragPointerRef.current.startX
    const moveSteps = Math.round(deltaX / 10)
    const nextStart = clamp(dragPointerRef.current.startView - moveSteps, 0, maxStart)
    setViewStart(nextStart)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragPointerRef.current.dragging = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="chart-wrap" onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={() => { dragPointerRef.current.dragging = false }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" role="img" aria-label="Candlestick chart">
        {gridLines.map((line) => (
          <g key={`grid-${line.value}`}>
            <line x1={plotLeft} y1={line.y} x2={plotRight} y2={line.y} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 4" />
            <text x={chartWidth - 10} y={line.y + 3} textAnchor="end" fill="#7f8a9e" fontSize="10" fontFamily="monospace">{formatPrice(line.value)}</text>
          </g>
        ))}

        <line x1={plotLeft} y1={priceLineY} x2={plotRight} y2={priceLineY} stroke="rgba(16,185,129,0.7)" strokeDasharray="2 6" />

        {chartCandles.map((candle, index) => {
          const x = toX(index, chartCandles.length)
          const candleWidth = Math.max((plotRight - plotLeft) / Math.max(chartCandles.length, 1) * 0.7, 3)
          const openY = toY(candle.open)
          const closeY = toY(candle.close)
          const highY = toY(candle.high)
          const lowY = toY(candle.low)
          const isUp = candle.close >= candle.open
          const color = isUp ? '#13c38b' : '#f2545e'

          return (
            <g key={`${candle.time}-${index}`}>
              <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth={1.2} />
              <rect x={x - candleWidth / 2} y={Math.min(openY, closeY)} width={candleWidth} height={Math.max(Math.abs(closeY - openY), 4)} rx={1.3} fill={color} opacity={0.96} />
            </g>
          )
        })}

        {chartCandles.map((candle, index) => {
          const x = toX(index, chartCandles.length)
          const labelIndex = [0, Math.floor(chartCandles.length * 0.2), Math.floor(chartCandles.length * 0.4), Math.floor(chartCandles.length * 0.6), Math.floor(chartCandles.length * 0.8), chartCandles.length - 1]
          if (!labelIndex.includes(index)) return null

          return (
            <text key={`label-${candle.time}`} x={x} y={chartHeight - 8} textAnchor="middle" fill="#7f8a9e" fontSize="10" fontFamily="monospace">
              {new Date(candle.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
