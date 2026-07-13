import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useProgrammeStore } from '../../store/programmeStore'
import { daysBetween, addDays, todayStr } from '../../utils/date-utils'

interface CurvePoint {
  date: string
  planned: number
  earned: number
  forecast: number
}

export default function SCurve() {
  const activities = useProgrammeStore((s) => s.activities)
  const baselines = useProgrammeStore((s) => s.baselines)
  const project = useProgrammeStore((s) => s.project)

  const { chartData, todayEarned, todayPlanned, variance } = useMemo(() => {
    if (activities.length === 0) {
      return { chartData: [] as CurvePoint[], todayEarned: 0, todayPlanned: 0, variance: 0 }
    }

    const totalDuration = activities.reduce((s, a) => s + Math.max(0, a.duration), 0)
    if (totalDuration === 0) {
      return { chartData: [] as CurvePoint[], todayEarned: 0, todayPlanned: 0, variance: 0 }
    }

    // Baseline lookup
    const blMap = new Map(
      baselines.length > 0
        ? baselines[0].snapshot.activities.map(a => [a.id, a])
        : [],
    )

    // ── Determine date range ──
    const allDates: string[] = []
    for (const a of activities) {
      if (a.startDate) allDates.push(a.startDate)
      if (a.finishDate) allDates.push(a.finishDate)
      if (a.actualStart) allDates.push(a.actualStart)
      if (a.actualFinish) allDates.push(a.actualFinish)
    }
    for (const [, bl] of blMap) {
      if (bl.startDate) allDates.push(bl.startDate)
      if (bl.finishDate) allDates.push(bl.finishDate)
    }
    allDates.sort()
    if (allDates.length < 2) {
      return { chartData: [] as CurvePoint[], todayEarned: 0, todayPlanned: 0, variance: 0 }
    }

    const minDate = allDates[0]
    const maxDate = allDates[allDates.length - 1]
    const totalDays = daysBetween(minDate, maxDate)
    const today = todayStr()

    // Sample every ~7 days, capped at ~50 points
    const step = Math.max(1, Math.ceil(totalDays / 50))
    const points: CurvePoint[] = []

    // Ensure today is included as a data point for the reference line
    const sampleOffsets = new Set<number>()
    for (let d = 0; d <= totalDays; d += step) sampleOffsets.add(d)
    if (today >= minDate && today <= maxDate) {
      sampleOffsets.add(daysBetween(minDate, today))
    }

    const sortedOffsets = [...sampleOffsets].sort((a, b) => a - b)

    let _todayEarned = 0
    let _todayPlanned = 0

    for (const d of sortedOffsets) {
      const date = addDays(minDate, d)

      // ── Planned (Baseline) ──
      let plannedDur = 0
      for (const a of activities) {
        const bl = blMap.get(a.id)
        if (bl && bl.startDate && bl.finishDate) {
          if (bl.finishDate <= date) {
            plannedDur += a.duration
          } else if (bl.startDate <= date) {
            const elapsed = daysBetween(bl.startDate, date)
            const ratio = Math.min(1, elapsed / Math.max(1, a.duration))
            plannedDur += a.duration * ratio
          }
        }
      }

      // ── Earned (Actual progress) ──
      let earnedDur = 0
      for (const a of activities) {
        const dur = Math.max(0, a.duration)
        if (a.actualFinish) {
          if (date >= a.actualFinish) {
            earnedDur += dur
          } else if (a.actualStart && date >= a.actualStart) {
            const span = daysBetween(a.actualStart, a.actualFinish)
            const elapsed = daysBetween(a.actualStart, date)
            if (span > 0) earnedDur += dur * Math.min(1, elapsed / span)
          }
        } else if (a.actualStart && date >= a.actualStart) {
          if (date >= today) {
            earnedDur += dur * (a.percentComplete / 100)
          } else {
            const daysSinceStart = Math.max(1, daysBetween(a.actualStart, today))
            const elapsed = daysBetween(a.actualStart, date)
            earnedDur += dur * (a.percentComplete / 100) * Math.min(1, elapsed / daysSinceStart)
          }
        }
      }

      // ── Forecast (Current schedule) ──
      let forecastDur = 0
      for (const a of activities) {
        if (a.finishDate && a.finishDate <= date) {
          forecastDur += a.duration
        } else if (a.startDate && a.startDate <= date) {
          const elapsed = daysBetween(a.startDate, date)
          const ratio = Math.min(1, elapsed / Math.max(1, a.duration))
          forecastDur += a.duration * ratio
        }
      }

      const planned = Math.round((plannedDur / totalDuration) * 1000) / 10
      const earned = Math.round((earnedDur / totalDuration) * 1000) / 10
      const forecast = Math.round((forecastDur / totalDuration) * 1000) / 10

      if (date === today) {
        _todayEarned = earned
        _todayPlanned = planned
      }

      points.push({ date, planned, earned, forecast })
    }

    return {
      chartData: points,
      todayEarned: _todayEarned,
      todayPlanned: _todayPlanned,
      variance: Math.round((_todayEarned - _todayPlanned) * 10) / 10,
    }
  }, [activities, baselines])

  if (chartData.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">S-Curve — Cumulative Progress</h3>
        <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>
      </div>
    )
  }

  const today = todayStr()
  const hasToday = chartData.some(p => p.date === today)
  const dataDate = project?.dataDate

  return (
    <div className="bg-white border rounded-lg p-4">
      {/* Title + Summary */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700">S-Curve — Cumulative Progress</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Planned:</span>
            <span className="font-bold text-blue-600">{todayPlanned}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Earned:</span>
            <span className={`font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{todayEarned}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Variance:</span>
            <span className={`font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {variance >= 0 ? '+' : ''}{variance}%
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            height={50}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
          />
          <Tooltip
            formatter={(v: any, name: string) => [`${v}%`, name]}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <ReferenceLine y={50} stroke="#d1d5db" strokeDasharray="5 5" />

          {/* Today reference line */}
          {hasToday && (
            <ReferenceLine
              x={today}
              stroke="#ef4444"
              strokeWidth={1.5}
              label={{ value: 'Today', position: 'top', fill: '#ef4444', fontSize: 10 }}
            />
          )}

          {/* Baseline (Planned) */}
          {baselines.length > 0 && (
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Baseline (Planned)"
              dot={false}
            />
          )}

          {/* Actual (Earned) */}
          <Line
            type="monotone"
            dataKey="earned"
            stroke="#22c55e"
            strokeWidth={2.5}
            name="Actual (Earned)"
            dot={false}
          />

          {/* Forecast (Current Schedule) */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            name="Forecast (Current)"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500">
        <div className="flex items-start gap-1.5">
          <span className="w-4 h-0.5 bg-blue-500 mt-1 flex-shrink-0" />
          <span><b className="text-gray-700">Baseline</b> — 計劃進度（匯入時快照）</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="w-4 h-0.5 bg-green-500 mt-1 flex-shrink-0" />
          <span><b className="text-gray-700">Actual</b> — 已完成工作量（Actual Start/Finish + %）</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 mt-1 flex-shrink-0" />
          <span><b className="text-gray-700">Forecast</b> — 當前排程預測完工軌跡</span>
        </div>
      </div>
    </div>
  )
}
