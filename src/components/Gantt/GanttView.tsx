import { useMemo, useState } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'
import { addDays, todayStr } from '../../utils/date-utils'

const DAY_W = 10
const ROW_H = 26
const HEADER_H = 28
const LEFT_W = 260

// Use UTC to avoid timezone issues
function toTs(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getTime()
}

export default function GanttView() {
  const activities = useProgrammeStore((s) => s.activities)
  const [editId, setEditId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'start' | 'finish' | 'pct' | null>(null)
  const [editVal, setEditVal] = useState('')

  // Note: In-place editing will be added in WBS Tree, not Gantt.
  // Gantt is a read-only visualization.

  const { minDate, totalDays } = useMemo(() => {
    if (activities.length === 0) return { minDate: '', totalDays: 0 }
    let min = Infinity
    let max = -Infinity
    for (const a of activities) {
      if (a.startDate) { const t = toTs(a.startDate); if (t < min) min = t; if (t > max) max = t }
      if (a.finishDate) { const t = toTs(a.finishDate); if (t < min) min = t; if (t > max) max = t }
    }
    if (min === Infinity) return { minDate: '', totalDays: 0 }
    // Extend 7 days on each side
    min -= 7 * 86400000
    max += 7 * 86400000
    const days = Math.ceil((max - min) / 86400000) + 1
    return { minDate: new Date(min).toISOString().slice(0, 10), totalDays: days }
  }, [activities])

  const today = todayStr()
  const todayX = useMemo(() => {
    if (!minDate) return -1
    return Math.round((toTs(today) - toTs(minDate)) / 86400000)
  }, [minDate, today])

  if (activities.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No activities. Import a CSV to see the Gantt chart.</div>
  }

  const chartW = totalDays * DAY_W
  const totalW = LEFT_W + chartW + 20
  const totalH = HEADER_H + activities.length * ROW_H + 10
  const minTs = toTs(minDate)

  // Month divider labels
  const months: { label: string; x: number }[] = []
  let prevM = ''
  for (let d = 0; d <= totalDays; d++) {
    const cur = new Date(minTs + d * 86400000)
    const m = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`
    if (m !== prevM) {
      months.push({ label: m, x: LEFT_W + d * DAY_W })
      prevM = m
    }
  }

  const todayInRange = todayX >= 0 && todayX <= totalDays

  return (
    <div className="overflow-auto border rounded-lg" style={{ maxHeight: '80vh' }}>
      <svg width={totalW} height={totalH} style={{ minWidth: '100%' }}>
        {/* Header */}
        <rect x={0} y={0} width={totalW} height={HEADER_H} fill="#f1f5f9" />
        {months.map((m, i) => (
          <text key={i} x={m.x + 3} y={HEADER_H - 8} fontSize={10} fill="#94a3b8" fontWeight={600}>
            {m.label}
          </text>
        ))}

        {/* Today line — thick red, behind bars */}
        {todayInRange && (
          <>
            <line x1={LEFT_W + todayX * DAY_W} y1={HEADER_H} x2={LEFT_W + todayX * DAY_W} y2={totalH}
              stroke="#ef4444" strokeWidth={3} opacity={0.6} />
            {/* Today label at top */}
            <rect x={LEFT_W + todayX * DAY_W - 20} y={0} width={40} height={HEADER_H} fill="#ef4444" rx={2} />
            <text x={LEFT_W + todayX * DAY_W} y={HEADER_H - 9} fontSize={10} fill="#fff" fontWeight={700}
              textAnchor="middle">TODAY</text>
          </>
        )}

        {/* Rows */}
        {activities.map((a, i) => {
          const y = HEADER_H + i * ROW_H
          const start = a.startDate ? toTs(a.startDate) : minTs
          const end = a.finishDate ? toTs(a.finishDate) : start + (a.duration || 1) * 86400000
          const x0 = LEFT_W + Math.max(0, Math.round((start - minTs) / 86400000)) * DAY_W
          const w = Math.max(DAY_W, Math.round((end - start) / 86400000) * DAY_W)
          const pct = a.percentComplete || 0
          const bg = i % 2 === 0 ? '#fff' : '#f8fafc'
          const color = a.isCritical ? '#ef4444' : a.isMilestone ? '#8b5cf6' : '#3b82f6'

          return (
            <g key={a.id}>
              <rect x={0} y={y} width={totalW} height={ROW_H} fill={bg} />
              
              {/* Row separator */}
              <line x1={0} y1={y + ROW_H} x2={totalW} y2={y + ROW_H} stroke="#e2e8f0" strokeWidth={0.5} />

              <text x={6} y={y + 17} fontSize={11} fill={a.isCritical ? '#991b1b' : '#334155'}
                fontWeight={a.isCritical ? 600 : 400}>
                {a.wbsCode}
              </text>
              <text x={52} y={y + 17} fontSize={11} fill="#475569">
                {a.name.length > 22 ? a.name.slice(0, 21) + '…' : a.name}
              </text>

              {a.isMilestone ? (
                <polygon
                  points={`${x0 + 8},${y + ROW_H / 2} ${x0 + 18},${y + 4} ${x0 + 28},${y + ROW_H / 2} ${x0 + 18},${y + ROW_H - 4}`}
                  fill={color}
                />
              ) : (
                <>
                  <rect x={x0} y={y + 8} width={w} height={ROW_H - 16} rx={3} fill={color} opacity={0.25} />
                  <rect x={x0} y={y + 8} width={Math.max(2, w * (pct / 100))} height={ROW_H - 16} rx={3} fill={color} />
                  {w > 50 && (
                    <text x={x0 + 4} y={y + 17} fontSize={9} fill="#fff" fontWeight={600}>
                      {pct}%
                    </text>
                  )}
                  {w > 70 && (
                    <text x={x0 + w / 2} y={y + 17} fontSize={8} fill="#fff" textAnchor="middle" opacity={0.7}>
                      {a.wbsCode}
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
