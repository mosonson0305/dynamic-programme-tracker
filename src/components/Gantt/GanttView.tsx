import { useMemo } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'

const DAY_W = 10
const ROW_H = 26
const HEADER_H = 24
const LEFT_W = 260

export default function GanttView() {
  const activities = useProgrammeStore((s) => s.activities)

  const { minDate, totalDays } = useMemo(() => {
    if (activities.length === 0) return { minDate: '', totalDays: 0 }
    let min = Infinity
    let max = -Infinity
    for (const a of activities) {
      if (a.startDate) { const t = new Date(a.startDate + 'T00:00:00').getTime(); if (t < min) min = t; if (t > max) max = t }
      if (a.finishDate) { const t = new Date(a.finishDate + 'T00:00:00').getTime(); if (t < min) min = t; if (t > max) max = t }
    }
    if (min === Infinity) return { minDate: '', totalDays: 0 }
    const days = Math.ceil((max - min) / 86400000) + 2
    return { minDate: new Date(min).toISOString().slice(0, 10), totalDays: days }
  }, [activities])

  const today = new Date().toISOString().slice(0, 10)
  const todayX = useMemo(() => {
    if (!minDate) return -1
    return Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(minDate + 'T00:00:00').getTime()) / 86400000)
  }, [minDate, today])

  if (activities.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No activities. Import a CSV to see the Gantt chart.</div>
  }

  const chartW = totalDays * DAY_W
  const totalW = LEFT_W + chartW + 20
  const totalH = HEADER_H + activities.length * ROW_H + 10
  const minTs = new Date(minDate + 'T00:00:00').getTime()

  // Month divider lines
  const months: { label: string; x: number }[] = []
  let prevM = ''
  for (let d = 0; d <= totalDays; d++) {
    const cur = new Date(minTs + d * 86400000)
    const m = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    if (m !== prevM) {
      months.push({ label: m, x: LEFT_W + d * DAY_W })
      prevM = m
    }
  }

  return (
    <div className="overflow-auto border rounded-lg" style={{ maxHeight: '80vh' }}>
      <svg width={totalW} height={totalH} style={{ minWidth: '100%' }}>
        {/* Header */}
        <rect x={0} y={0} width={totalW} height={HEADER_H} fill="#f1f5f9" />
        {months.map((m, i) => (
          <text key={i} x={m.x + 3} y={HEADER_H - 6} fontSize={10} fill="#94a3b8" fontWeight={600}>{m.label}</text>
        ))}

        {/* Today line */}
        {todayX >= 0 && todayX <= totalDays && (
          <line x1={LEFT_W + todayX * DAY_W} y1={HEADER_H} x2={LEFT_W + todayX * DAY_W} y2={totalH}
            stroke="#ef4444" strokeWidth={2} strokeDasharray="4 3" />
        )}

        {/* Rows */}
        {activities.map((a, i) => {
          const y = HEADER_H + i * ROW_H
          const start = a.startDate ? new Date(a.startDate + 'T00:00:00').getTime() : minTs
          const end = a.finishDate ? new Date(a.finishDate + 'T00:00:00').getTime() : start + (a.duration || 1) * 86400000
          const x = LEFT_W + Math.max(0, Math.floor((start - minTs) / 86400000)) * DAY_W
          const w = Math.max(DAY_W, Math.ceil((end - start) / 86400000) * DAY_W)
          const pct = a.percentComplete || 0

          const bg = i % 2 === 0 ? '#fff' : '#f8fafc'
          const color = a.isCritical ? '#ef4444' : a.isMilestone ? '#8b5cf6' : '#3b82f6'

          return (
            <g key={a.id}>
              <rect x={0} y={y} width={totalW} height={ROW_H} fill={bg} />
              <text x={6} y={y + 17} fontSize={11} fill={a.isCritical ? '#991b1b' : '#334155'} fontWeight={a.isCritical ? 600 : 400}>
                {a.wbsCode}
              </text>
              <text x={50} y={y + 17} fontSize={11} fill="#475569">
                {a.name.length > 24 ? a.name.slice(0, 23) + '…' : a.name}
              </text>

              {a.isMilestone ? (
                <polygon
                  points={`${x + 8},${y + ROW_H / 2} ${x + 18},${y + 4} ${x + 28},${y + ROW_H / 2} ${x + 18},${y + ROW_H - 4}`}
                  fill={color}
                />
              ) : (
                <>
                  <rect x={x} y={y + 8} width={w} height={ROW_H - 16} rx={3} fill={color} opacity={0.25} />
                  <rect x={x} y={y + 8} width={Math.max(2, w * (pct / 100))} height={ROW_H - 16} rx={3} fill={color} />
                  {w > 40 && (
                    <text x={x + 4} y={y + 17} fontSize={9} fill="#fff" fontWeight={500}>
                      {a.wbsCode} {pct}%
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
