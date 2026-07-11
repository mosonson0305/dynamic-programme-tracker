import { useMemo } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'
import { todayStr, addDays } from '../../utils/date-utils'
import type { ActivityStatus } from '../../models'

function StatusBadge({ status }: { status: ActivityStatus }) {
  const colorMap: Record<ActivityStatus, string> = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    not_started: 'bg-gray-100 text-gray-600',
    delayed: 'bg-red-100 text-red-700',
  }
  const labelMap: Record<ActivityStatus, string> = {
    completed: 'Done',
    in_progress: 'In Progress',
    not_started: 'Pending',
    delayed: 'Delayed',
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorMap[status]}`}
    >
      {labelMap[status]}
    </span>
  )
}

export default function UpcomingMilestones() {
  const activities = useProgrammeStore((s) => s.activities)

  const milestones = useMemo(() => {
    const today = todayStr()
    const cutoff = addDays(today, 28)

    console.log('[Upcoming] today:', today, 'cutoff:', cutoff, 'total activities:', activities.length,
      'milestones:', activities.filter(a => a.isMilestone).length)

    const candidates = activities
      .filter((a) => a.isMilestone)
      .filter((a) => {
        if (!a.finishDate) return false
        const inRange = a.finishDate >= today && a.finishDate <= cutoff
        if (!inRange) console.log('  [Upcoming] SKIP', a.wbsCode, a.name, 'finishDate:', a.finishDate)
        return inRange
      })
      .sort((a, b) => {
        const da = a.finishDate || ''
        const db = b.finishDate || ''
        return da.localeCompare(db)
      })

    console.log('[Upcoming] rendered:', candidates.length)
    return candidates
  }, [activities])

  if (milestones.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Milestones (28 days)</h3>
        <div className="text-gray-400 text-sm">No milestones in the next 28 days</div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Upcoming Milestones (28 days)
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Milestone</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((m) => (
            <tr key={m.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 font-mono text-xs text-gray-600">
                {m.finishDate ? m.finishDate.substring(5) : '-'}
              </td>
              <td className="py-2 pr-4 text-gray-800">{m.name}</td>
              <td className="py-2">
                <StatusBadge status={m.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
