import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'

export type MarketChartCandle = {
  t: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type Props = {
  data: MarketChartCandle[]
  symbol?: string
  name?: string
  height?: number
  loading?: boolean
  live?: boolean
  chartRange?: string
}

const padding = { top: 12, right: 58, bottom: 27, left: 10 }
const minimumVisibleBars = 12

const formatPrice = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 6 : 2 })}`
const formatDate = (value: number) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value)

export function MarketChart({ data, symbol = 'SOL/USDC', name = 'Solana', height = 380, loading = false, live = false, chartRange = 'All' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; viewStart: number; moved: boolean } | null>(null)
  const [width, setWidth] = useState(0)
  const [viewStart, setViewStart] = useState(0)
  const [visibleBars, setVisibleBars] = useState(data.length)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverY, setHoverY] = useState<number | null>(null)

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const validData = useMemo(
    () => data.filter((candle) => Number.isFinite(candle.t) && Number.isFinite(candle.open) && Number.isFinite(candle.high) && Number.isFinite(candle.low) && Number.isFinite(candle.close) && Number.isFinite(candle.volume)),
    [data],
  )
  useEffect(() => {
    if (validData.length > 0) {
      setVisibleBars((current) => current === 0 ? validData.length : Math.min(current, validData.length))
    }
  }, [validData.length])
  const series = validData
  const presetBars = chartRange === '1d' ? 8 : chartRange === '5d' ? 40 : series.length
  const boundedVisibleBars = Math.max(1, Math.min(visibleBars, series.length || 1))
  const maxStart = Math.max(0, series.length - boundedVisibleBars)
  const boundedStart = Math.max(0, Math.min(viewStart, maxStart))
  const candles = useMemo(() => series.slice(boundedStart, boundedStart + boundedVisibleBars), [boundedStart, boundedVisibleBars, series])
  const rangeRef = useRef(chartRange)

  useEffect(() => {
    if (rangeRef.current !== chartRange) {
      rangeRef.current = chartRange
      const nextVisible = Math.min(Math.max(presetBars, 1), series.length || 1)
      setVisibleBars(nextVisible)
      setViewStart(Math.max(0, series.length - nextVisible))
      setHoverIndex(null)
      setHoverY(null)
      return
    }
    setViewStart((current) => Math.min(current, Math.max(0, series.length - boundedVisibleBars)))
  }, [boundedVisibleBars, chartRange, presetBars, series.length])

  const chartWidth = Math.max(width, 260)
  const plotRight = chartWidth - padding.right
  const plotWidth = Math.max(1, plotRight - padding.left)
  const plotTop = padding.top
  const plotBottom = height - padding.bottom
  const volumeHeight = Math.round((plotBottom - plotTop) * 0.18)
  const volumeTop = plotBottom - volumeHeight
  const priceBottom = volumeTop - 12
  const priceHeight = Math.max(1, priceBottom - plotTop)
  const step = plotWidth / Math.max(candles.length, 1)
  const bodyWidth = Math.max(1, Math.min(step * 0.62, 10))
  const hovered = hoverIndex == null ? undefined : candles[hoverIndex]
  const last = candles[candles.length - 1]

  const domain = useMemo(() => {
    if (candles.length === 0) return [0, 1] as const
    const low = Math.min(...candles.map((candle) => candle.low))
    const high = Math.max(...candles.map((candle) => candle.high))
    const extra = (high - low) * 0.08 || Math.abs(high) * 0.02 || 1
    const stepSize = 1
    return [Math.floor((low - extra) / stepSize) * stepSize, Math.ceil((high + extra) / stepSize) * stepSize] as const
  }, [candles])
  const [domainLow, domainHigh] = domain
  const priceY = useCallback(
    (value: number) => priceBottom - ((value - domainLow) / (domainHigh - domainLow || 1)) * priceHeight,
    [domainHigh, domainLow, priceBottom, priceHeight],
  )
  const maxVolume = Math.max(1, ...candles.map((candle) => candle.volume))
  const ticks = Array.from({ length: 6 }, (_, index) => domainLow + ((domainHigh - domainLow) * index) / 5)
  const timeIndexes = candles.length <= 1
    ? [0]
    : Array.from(new Set([0, Math.floor((candles.length - 1) / 5), Math.floor((candles.length - 1) * 2 / 5), Math.floor((candles.length - 1) * 3 / 5), Math.floor((candles.length - 1) * 4 / 5), candles.length - 1]))
  const shownCandle = hovered ?? last
  const baseline = candles[0]?.close ?? 0
  const change = baseline ? (((shownCandle?.close ?? baseline) - baseline) / baseline) * 100 : 0
  const changeColor = change >= 0 ? '#24d39a' : '#f25468'

  const updateCrosshair = (event: PointerEvent<SVGSVGElement>) => {
    if (candles.length === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * chartWidth
    const y = ((event.clientY - bounds.top) / bounds.height) * height
    const drag = dragRef.current
    if (drag && drag.pointerId === event.pointerId) {
      const delta = event.clientX - drag.startX
      if (Math.abs(delta) > 3) drag.moved = true
      if (drag.moved) {
        const shift = Math.round(-delta / step)
        setViewStart(Math.max(0, Math.min(series.length - boundedVisibleBars, drag.viewStart + shift)))
        setHoverIndex(null)
        setHoverY(null)
        return
      }
    }
    const index = Math.floor((x - padding.left) / step)
    setHoverIndex(Math.max(0, Math.min(candles.length - 1, index)))
    setHoverY(Math.max(plotTop, Math.min(priceBottom, y)))
  }

  const zoomAt = (zoomRatio: number, anchorX = plotWidth / 2) => {
    // zoomRatio > 1 => zoom in (fewer bars). zoomRatio < 1 => zoom out (more bars).
    if (series.length <= minimumVisibleBars) return
    const nextVisible = Math.max(minimumVisibleBars, Math.min(series.length, Math.round(boundedVisibleBars / zoomRatio)))
    const safeAnchor = Math.max(0, Math.min(plotWidth - 1, anchorX))
    const indexAtPointer = boundedStart + Math.max(0, Math.min(boundedVisibleBars - 1, Math.floor(safeAnchor / Math.max(1, step))))
    const ratio = Math.max(0, Math.min(1, safeAnchor / plotWidth))
    const nextStart = Math.round(indexAtPointer - Math.round(ratio * nextVisible))
    setVisibleBars(nextVisible)
    setViewStart(Math.max(0, Math.min(series.length - nextVisible, nextStart)))
    setHoverIndex(null)
    setHoverY(null)
  }

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    // make wheel zoom slower and smooth: derive zoom ratio from deltaY
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const localX = ((event.clientX - bounds.left) / bounds.width) * chartWidth - padding.left
    // deltaY usually ~ ±100 per notch; use small k for gentle zoom
    const k = 0.0016
    const zoomRatio = Math.exp(-event.deltaY * k)
    zoomAt(zoomRatio, localX)
  }

  const resetView = () => {
    const nextVisible = Math.min(Math.max(presetBars, 1), series.length || 1)
    setVisibleBars(nextVisible)
    setViewStart(Math.max(0, series.length - nextVisible))
    setHoverIndex(null)
    setHoverY(null)
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, viewStart: boundedStart, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      const moved = dragRef.current.moved
      dragRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      if (moved) return
    }
  }

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'Escape') {
      setHoverIndex(null)
      setHoverY(null)
      return
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    setHoverIndex((current) => Math.max(0, Math.min(candles.length - 1, (current ?? candles.length - 1) + direction)))
    setHoverY(null)
  }

  return (
    <section className="market-chart">
      <div className="market-chart-heading">
        <div className="market-chart-summary">
          <div className="market-chart-title">
            <strong>{symbol}</strong>
            <span>{name}</span>
            <span className={`market-chart-status${live && !loading ? ' is-live' : ''}`}>{loading ? 'Loading…' : live ? 'Live' : 'Spot market'}</span>
          </div>
          <div className="market-chart-price-row">
            <strong>{formatPrice(shownCandle?.close ?? 0)}</strong>
            <span style={{ color: changeColor }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
          </div>
          <div className="market-chart-ohlc" aria-live="polite">
            {shownCandle ? (
              <>
                {hovered && <span>{formatDate(hovered.t)}</span>}
                <span>O <b>{formatPrice(shownCandle.open)}</b></span>
                <span>H <b>{formatPrice(shownCandle.high)}</b></span>
                <span>L <b>{formatPrice(shownCandle.low)}</b></span>
                <span>C <b>{formatPrice(shownCandle.close)}</b></span>
                <span>V <b>{shownCandle.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></span>
              </>
            ) : <span>Waiting for market data</span>}
          </div>
        </div>
      </div>
      <div ref={wrapRef} className="market-chart-plot" style={{ height }}>
        {width > 0 && candles.length > 0 ? (
          <svg
            width={chartWidth}
            height={height}
            viewBox={`0 0 ${chartWidth} ${height}`}
            role="img"
            aria-label={`${symbol} ${name} candlestick chart, latest price ${formatPrice(last?.close ?? 0)}`}
            tabIndex={0}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={updateCrosshair}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              if (!dragRef.current) {
                setHoverIndex(null)
                setHoverY(null)
              }
            }}
            onDoubleClick={resetView}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setHoverIndex(null)
              setHoverY(null)
            }}
          >
            {ticks.map((tick) => {
              const y = priceY(tick)
              return (
                <g key={tick}>
                  <line x1={padding.left} x2={plotRight} y1={y} y2={y} stroke="currentColor" strokeOpacity=".13" strokeDasharray="2 4" />
                  <text x={plotRight + 8} y={y} dominantBaseline="middle" fill="currentColor" fontSize="10" className="font-mono">{tick.toFixed(2)}</text>
                </g>
              )
            })}
            <text x={(padding.left + plotRight) / 2} y={(priceBottom + plotTop) / 2} textAnchor="middle" fill="#ffffff" opacity=".025" fontSize="46" fontWeight="700">◉ Backpack</text>
            {timeIndexes.map((index) => {
              const x = padding.left + step * (index + 0.5)
              return <line key={`time-grid-${index}`} x1={x} x2={x} y1={plotTop} y2={plotBottom} stroke="currentColor" strokeOpacity=".08" />
            })}
            {timeIndexes.map((index) => {
              const candle = candles[index]
              return candle ? (
                <text key={candle.t} x={padding.left + step * (index + 0.5)} y={height - 6} textAnchor="middle" fill="currentColor" fontSize="10" className="font-mono">
                  {new Date(candle.t).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </text>
              ) : null
            })}
            {hoverIndex != null && (
              <rect x={padding.left + step * hoverIndex} y={plotTop} width={step} height={plotBottom - plotTop} fill="currentColor" opacity=".045" />
            )}
            {candles.map((candle, index) => {
              const x = padding.left + step * (index + 0.5)
              const color = candle.close >= candle.open ? '#24d39a' : '#f25468'
              const openY = priceY(candle.open)
              const closeY = priceY(candle.close)
              const bodyHeight = Math.max(1, Math.abs(closeY - openY))
              const barHeight = Math.max(1, (candle.volume / maxVolume) * volumeHeight * 0.88)
              return (
                <g key={`${candle.t}-${index}`}>
                  <line x1={x} x2={x} y1={priceY(candle.high)} y2={priceY(candle.low)} stroke={color} strokeWidth="1.2" />
                  <rect x={x - bodyWidth / 2} y={Math.min(openY, closeY)} width={bodyWidth} height={bodyHeight} rx="1" fill={color} />
                  <rect x={x - bodyWidth / 2} y={plotBottom - barHeight} width={bodyWidth} height={barHeight} rx="1" fill={color} opacity=".36" />
                </g>
              )
            })}
            <text x={padding.left + 4} y={volumeTop + 14} fill="#858b99" fontSize="10">Volume SMA</text>
            <text x={padding.left + 68} y={volumeTop + 14} fill="#e85b67" fontSize="10" className="font-mono">{(candles.reduce((sum, candle) => sum + candle.volume, 0) / Math.max(candles.length, 1) / 1000).toFixed(2)}K</text>
            <text x={plotRight + 8} y={volumeTop + 14} fill="#858b99" fontSize="10" className="font-mono">{(maxVolume / 1000).toFixed(0)}K</text>
            <line x1={padding.left} x2={chartWidth} y1={volumeTop - 6} y2={volumeTop - 6} stroke="currentColor" strokeOpacity=".2" />
            {last && (
              <>
                <line x1={padding.left} x2={plotRight} y1={priceY(last.close)} y2={priceY(last.close)} stroke={last.close >= last.open ? '#24d39a' : '#f25468'} strokeDasharray="4 4" strokeOpacity=".7" />
                <rect x={plotRight + 3} y={priceY(last.close) - 9} width={padding.right - 6} height="18" rx="3" fill={last.close >= last.open ? '#24d39a' : '#f25468'} />
                <text x={plotRight + padding.right / 2} y={priceY(last.close)} textAnchor="middle" dominantBaseline="middle" fill="#07110e" fontSize="10" fontWeight="700" className="font-mono">{last.close.toFixed(2)}</text>
              </>
            )}
            {hoverIndex != null && (
              <>
                <line x1={padding.left + step * (hoverIndex + 0.5)} x2={padding.left + step * (hoverIndex + 0.5)} y1={plotTop} y2={plotBottom} stroke="currentColor" strokeOpacity=".45" strokeDasharray="3 3" />
                {hoverY != null && (
                  <line x1={padding.left} x2={plotRight} y1={hoverY} y2={hoverY} stroke="currentColor" strokeOpacity=".45" strokeDasharray="3 3" />
                )}
              </>
            )}
          </svg>
        ) : (
          <div className="market-chart-empty">{loading ? 'Loading market history…' : data.length > 0 ? 'Preparing chart…' : 'No price data available'}</div>
        )}
        {width > 0 && candles.length > 0 && (
          <div className="market-chart-nav" aria-label="Chart controls">
                      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomAt(1.25)}><Plus size={14} /></button>
                      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomAt(0.8)}><Minus size={14} /></button>
            <button type="button" aria-label="Reset chart zoom" title="Reset chart zoom" onClick={resetView}><Maximize2 size={13} /></button>
          </div>
        )}
      </div>
    </section>
  )
}
