import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

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
}

const padding = { top: 12, right: 68, bottom: 28, left: 12 }
const ranges = [
  { label: '1H', bars: 60 },
  { label: '4H', bars: 120 },
  { label: '1D', bars: 240 },
  { label: '1W', bars: 720 },
  { label: 'ALL', bars: undefined },
] as const

const formatPrice = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 6 : 2 })}`
const formatDate = (value: number) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value)

export function MarketChart({ data, symbol = 'SOL/USDC', name = 'Solana', height = 380, loading = false, live = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [range, setRange] = useState<(typeof ranges)[number]['label']>('1D')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverY, setHoverY] = useState<number | null>(null)
  const [liveTicks, setLiveTicks] = useState<MarketChartCandle[]>([])

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
    setLiveTicks([])
    if (!live || validData.length === 0) return

    let previous = validData[validData.length - 1]
    const interval = window.setInterval(() => {
      const close = Math.max(0.000001, previous.close * (1 + (Math.random() - 0.48) * 0.002))
      const next: MarketChartCandle = {
        t: previous.t + 60_000,
        open: previous.close,
        high: Math.max(previous.close, close) * (1 + Math.random() * 0.001),
        low: Math.min(previous.close, close) * (1 - Math.random() * 0.001),
        close,
        volume: Math.max(1, previous.volume * (0.6 + Math.random())),
      }
      previous = next
      setLiveTicks((current) => [...current, next].slice(-120))
    }, 1600)

    return () => window.clearInterval(interval)
  }, [live, validData])
  const rangeConfig = ranges.find((option) => option.label === range) ?? ranges[2]
  const series = useMemo(() => liveTicks.length > 0 ? [...validData, ...liveTicks] : validData, [liveTicks, validData])
  const candles = useMemo(
    () => rangeConfig.bars && rangeConfig.bars < series.length ? series.slice(-rangeConfig.bars) : series,
    [rangeConfig, series],
  )
  const chartWidth = Math.max(width, 260)
  const plotRight = chartWidth - padding.right
  const plotWidth = Math.max(1, plotRight - padding.left)
  const plotTop = padding.top
  const plotBottom = height - padding.bottom
  const volumeHeight = Math.round((plotBottom - plotTop) * 0.2)
  const volumeTop = plotBottom - volumeHeight
  const priceBottom = volumeTop - 12
  const priceHeight = Math.max(1, priceBottom - plotTop)
  const step = plotWidth / Math.max(candles.length, 1)
  const bodyWidth = Math.max(1, Math.min(step * 0.68, 18))
  const hovered = hoverIndex == null ? undefined : candles[hoverIndex]
  const last = candles[candles.length - 1]

  const domain = useMemo(() => {
    if (candles.length === 0) return [0, 1] as const
    const low = Math.min(...candles.map((candle) => candle.low))
    const high = Math.max(...candles.map((candle) => candle.high))
    const extra = (high - low) * 0.12 || Math.abs(high) * 0.02 || 1
    return [low - extra, high + extra] as const
  }, [candles])
  const [domainLow, domainHigh] = domain
  const priceY = useCallback(
    (value: number) => priceBottom - ((value - domainLow) / (domainHigh - domainLow || 1)) * priceHeight,
    [domainHigh, domainLow, priceBottom, priceHeight],
  )
  const maxVolume = Math.max(1, ...candles.map((candle) => candle.volume))
  const ticks = Array.from({ length: 5 }, (_, index) => domainLow + ((domainHigh - domainLow) * index) / 4)
  const timeIndexes = candles.length <= 1
    ? [0]
    : Array.from(new Set([0, Math.floor((candles.length - 1) / 3), Math.floor((candles.length - 1) * 2 / 3), candles.length - 1]))
  const shownCandle = hovered ?? last
  const baseline = candles[0]?.close ?? 0
  const change = baseline ? (((shownCandle?.close ?? baseline) - baseline) / baseline) * 100 : 0
  const changeColor = change >= 0 ? '#24d39a' : '#f25468'

  const updateCrosshair = (event: PointerEvent<SVGSVGElement>) => {
    if (candles.length === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * chartWidth
    const y = ((event.clientY - bounds.top) / bounds.height) * height
    const index = Math.floor((x - padding.left) / step)
    setHoverIndex(Math.max(0, Math.min(candles.length - 1, index)))
    setHoverY(Math.max(plotTop, Math.min(priceBottom, y)))
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
            <span className={`market-chart-status${live && !loading ? ' is-live' : ''}`}>{loading ? 'Loading…' : live ? 'Demo live' : 'Spot market'}</span>
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
        <div className="market-chart-ranges" aria-label="Chart range">
          {ranges.map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={range === option.label}
              className={range === option.label ? 'active' : ''}
              onClick={() => {
                setRange(option.label)
                setHoverIndex(null)
                setHoverY(null)
              }}
            >
              {option.label}
            </button>
          ))}
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
            onPointerMove={updateCrosshair}
            onPointerLeave={() => {
              setHoverIndex(null)
              setHoverY(null)
            }}
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
                  <text x={plotRight + 8} y={y} dominantBaseline="middle" fill="currentColor" fontSize="10" className="font-mono">{formatPrice(tick)}</text>
                </g>
              )
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
              const dimmed = hoverIndex != null && hoverIndex !== index
              return (
                <g key={`${candle.t}-${index}`} opacity={dimmed ? 0.35 : 1}>
                  <line x1={x} x2={x} y1={priceY(candle.high)} y2={priceY(candle.low)} stroke={color} strokeWidth="1.2" />
                  <rect x={x - bodyWidth / 2} y={Math.min(openY, closeY)} width={bodyWidth} height={bodyHeight} rx="1" fill={color} />
                  <rect x={x - bodyWidth / 2} y={plotBottom - barHeight} width={bodyWidth} height={barHeight} rx="1" fill={color} opacity=".32" />
                </g>
              )
            })}
            <line x1={padding.left} x2={plotRight} y1={volumeTop - 6} y2={volumeTop - 6} stroke="currentColor" strokeOpacity=".1" />
            {last && (
              <>
                <line x1={padding.left} x2={plotRight} y1={priceY(last.close)} y2={priceY(last.close)} stroke={last.close >= last.open ? '#24d39a' : '#f25468'} strokeDasharray="4 4" strokeOpacity=".7" />
                <rect x={plotRight + 3} y={priceY(last.close) - 9} width={padding.right - 6} height="18" rx="3" fill={last.close >= last.open ? '#24d39a' : '#f25468'} />
                <text x={plotRight + padding.right / 2} y={priceY(last.close)} textAnchor="middle" dominantBaseline="middle" fill="#07110e" fontSize="10" fontWeight="700" className="font-mono">{formatPrice(last.close)}</text>
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
          <div className="market-chart-empty">{data.length > 0 ? 'Preparing chart…' : 'No price data available'}</div>
        )}
      </div>
    </section>
  )
}
