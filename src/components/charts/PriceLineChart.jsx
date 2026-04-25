import { t } from '../../i18n/zh-TW'

export function PriceLineChart({ points }) {
  if (points.length === 0) return null
  const width = 320
  const height = 140
  const left = 44
  const right = 14
  const top = 12
  const bottom = 28
  const min = Math.min(...points.map((point) => point.price))
  const max = Math.max(...points.map((point) => point.price))
  const range = max - min || 1
  const polyline = points
    .map((point, index) => {
      const x = left + (index / (points.length - 1 || 1)) * (width - left - right)
      const y = (height - bottom) - ((point.price - min) / range) * (height - top - bottom)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img" aria-label={t.tradeHistory.chartAria}>
      <line x1={left} y1={top} x2={left} y2={height - bottom} stroke="#d4d4d8" />
      <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#d4d4d8" />
      <polyline points={polyline} fill="none" stroke="#e11d2e" strokeWidth="3" strokeLinecap="round" />
      <text x={6} y={top + 4} className="chart-label">
        NT$ {max}
      </text>
      <text x={6} y={height - bottom} className="chart-label">
        NT$ {min}
      </text>
      <text x={left} y={height - 8} className="chart-label">
        {points[0].date}
      </text>
      <text x={width - right - 60} y={height - 8} className="chart-label">
        {points[points.length - 1].date}
      </text>
      <text x={width / 2 - 16} y={height - 8} className="chart-label">
        {t.tradeHistory.axisDate}
      </text>
      <text x={6} y={height / 2} className="chart-label">
        {t.tradeHistory.axisPrice}
      </text>
    </svg>
  )
}
