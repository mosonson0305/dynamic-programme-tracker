import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { useProgrammeStore } from '../../store/programmeStore'
import { daysBetween } from '../../utils/date-utils'

interface RowData {
  wbsCode: string
  name: string
  blStart: string
  blFinish: string
  curStart: string | null
  curFinish: string | null
  actStart: string | null
  actFinish: string | null
  startVar: number | null  // current - baseline
  finishVar: number | null // current - baseline
  actFinishVar: number | null // actual - baseline
  status: string
}

export default function BaselineComparison() {
  const activities = useProgrammeStore((s) => s.activities)
  const baselines = useProgrammeStore((s) => s.baselines)

  const { rows, summary } = useMemo(() => {
    if (!baselines.length) return { rows: [] as RowData[], summary: null }

    const blMap = new Map(baselines[0].snapshot.activities.map(a => [a.id, a]))
    const rows: RowData[] = []
    let ahead = 0, onTrack = 0, behind = 0, notStarted = 0
    let maxFinishVar = 0
    let totalDelay = 0

    for (const a of activities) {
      const bl = blMap.get(a.id)
      if (!bl || !bl.startDate || !bl.finishDate) continue

      const startVar = a.startDate ? daysBetween(bl.startDate, a.startDate) : null
      const finishVar = a.finishDate ? daysBetween(bl.finishDate, a.finishDate) : null
      const actFinishVar = a.actualFinish ? daysBetween(bl.finishDate, a.actualFinish) : null

      let status = 'not_started'
      if (a.status === 'completed') {
        if (actFinishVar !== null) {
          if (actFinishVar < 0) { status = 'ahead'; ahead++ }
          else if (actFinishVar === 0) { status = 'on_track'; onTrack++ }
          else { status = 'behind'; behind++; totalDelay += actFinishVar }
        } else {
          status = 'completed'
          onTrack++
        }
      } else if (a.status === 'in_progress') {
        if (finishVar !== null) {
          if (finishVar <= 0) { status = 'on_track'; onTrack++ }
          else { status = 'behind'; behind++ }
        } else { onTrack++ }
      } else if (a.status === 'delayed') {
        status = 'behind'; behind++
      } else {
        notStarted++
      }

      if (finishVar !== null && finishVar > maxFinishVar) maxFinishVar = finishVar

      rows.push({
        wbsCode: a.wbsCode,
        name: a.name,
        blStart: bl.startDate.slice(5),
        blFinish: bl.finishDate.slice(5),
        curStart: a.startDate ? a.startDate.slice(5) : '—',
        curFinish: a.finishDate ? a.finishDate.slice(5) : '—',
        actStart: a.actualStart ? a.actualStart.slice(5) : '—',
        actFinish: a.actualFinish ? a.actualFinish.slice(5) : '—',
        startVar,
        finishVar,
        actFinishVar,
        status,
      })
    }

    // Sort: behind first, then by finishVar descending
    rows.sort((a, b) => {
      const av = a.actFinishVar ?? a.finishVar ?? 0
      const bv = b.actFinishVar ?? b.finishVar ?? 0
      return bv - av
    })

    return {
      rows,
      summary: { ahead, onTrack, behind, notStarted, total: rows.length, maxFinishVar, totalDelay },
    }
  }, [activities, baselines])

  // Chart data: top variance activities
  const chartData = useMemo(() => {
    return rows
      .filter(r => r.finishVar !== null || r.actFinishVar !== null)
      .slice(0, 20)
      .map(r => ({
        name: r.wbsCode.length > 12 ? r.wbsCode.slice(0, 10) + '..' : r.wbsCode,
        fullName: `${r.wbsCode} — ${r.name}`,
        finishVar: r.actFinishVar ?? r.finishVar ?? 0,
      }))
  }, [rows])

  if (!baselines.length) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-lg font-bold text-gray-700 mb-1">No Baseline Available</h3>
        <p className="text-sm text-gray-500">
          Import a CSV with dates and dependencies to auto-create a baseline.
        </p>
      </div>
    )
  }

  if (!summary || rows.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <p className="text-sm text-gray-500">No activities to compare.</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    ahead: 'text-green-600 bg-green-50',
    on_track: 'text-blue-600 bg-blue-50',
    behind: 'text-red-600 bg-red-50',
    not_started: 'text-gray-400 bg-gray-50',
    completed: 'text-blue-600 bg-blue-50',
  }

  const statusLabels: Record<string, string> = {
    ahead: 'Ahead',
    on_track: 'On Track',
    behind: 'Behind',
    not_started: 'Not Started',
    completed: 'Completed',
  }

  const barColor = (v: number) => v > 0 ? '#ef4444' : v < 0 ? '#22c55e' : '#3b82f6'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Baseline vs Actual Comparison</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-700">{summary.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">On Track</div>
          <div className="text-2xl font-bold text-blue-600">{summary.onTrack}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Ahead</div>
          <div className="text-2xl font-bold text-green-600">{summary.ahead}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Behind</div>
          <div className="text-2xl font-bold text-red-600">{summary.behind}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Not Started</div>
          <div className="text-2xl font-bold text-gray-400">{summary.notStarted}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Delay</div>
          <div className={`text-2xl font-bold ${summary.totalDelay > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {summary.totalDelay > 0 ? '+' : ''}{summary.totalDelay}d
          </div>
        </div>
      </div>

      {/* Variance Bar Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Finish Date Variance (Top 20)</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
              <Tooltip
                formatter={(v: any) => [`${v > 0 ? '+' : ''}${v} days`, 'Variance']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
              />
              <ReferenceLine x={0} stroke="#6b7280" strokeWidth={1.5} />
              <Bar dataKey="finishVar" radius={[0, 3, 3, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={barColor(d.finishVar)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Behind (delayed)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" />Ahead (early)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />On Track</span>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase">WBS Code</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase">Activity Name</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">BL Start</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">BL Finish</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">Cur Start</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">Cur Finish</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">Act Start</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">Act Finish</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">Start Var</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">Finish Var</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const sv = r.actFinishVar !== null ? null : r.startVar
                const fv = r.actFinishVar ?? r.finishVar
                return (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-700 font-mono text-xs">{r.wbsCode}</td>
                    <td className="px-3 py-1.5 text-gray-700 max-w-xs truncate" title={r.name}>{r.name}</td>
                    <td className="px-3 py-1.5 text-center text-gray-500 font-mono text-xs">{r.blStart}</td>
                    <td className="px-3 py-1.5 text-center text-gray-500 font-mono text-xs">{r.blFinish}</td>
                    <td className="px-3 py-1.5 text-center text-gray-700 font-mono text-xs">{r.curStart}</td>
                    <td className="px-3 py-1.5 text-center text-gray-700 font-mono text-xs">{r.curFinish}</td>
                    <td className="px-3 py-1.5 text-center font-mono text-xs">{r.actStart === '—' ? <span className="text-gray-300">—</span> : r.actStart}</td>
                    <td className="px-3 py-1.5 text-center font-mono text-xs">{r.actFinish === '—' ? <span className="text-gray-300">—</span> : r.actFinish}</td>
                    <td className="px-3 py-1.5 text-center font-mono text-xs">
                      {sv === null || sv === null ? (
                        <span className="text-gray-300">—</span>
                      ) : sv === 0 ? (
                        <span className="text-gray-400">0d</span>
                      ) : (
                        <span className={sv > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {sv > 0 ? '+' : ''}{sv}d
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center font-mono text-xs">
                      {fv === null ? (
                        <span className="text-gray-300">—</span>
                      ) : fv === 0 ? (
                        <span className="text-gray-400">0d</span>
                      ) : (
                        <span className={fv > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {fv > 0 ? '+' : ''}{fv}d
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[r.status] || ''}`}>
                        {statusLabels[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
