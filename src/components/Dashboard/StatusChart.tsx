import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useProgrammeStore } from '../../store/programmeStore'
import type { ActivityStatus } from '../../models'

const STATUS_LABELS: Record<ActivityStatus, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  not_started: 'Not Started',
  delayed: 'Delayed',
}

const STATUS_ORDER: ActivityStatus[] = ['completed', 'in_progress', 'not_started', 'delayed']

export default function StatusChart() {
  const activities = useProgrammeStore((s) => s.activities)

  const data = useMemo(() => {
    const counts: Record<ActivityStatus, number> = {
      completed: 0,
      in_progress: 0,
      not_started: 0,
      delayed: 0,
    }
    for (const a of activities) {
      counts[a.status]++
    }
    return STATUS_ORDER.map((status) => ({
      status: STATUS_LABELS[status],
      count: counts[status],
    }))
  }, [activities])

  if (activities.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity Status</h3>
        <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
          No data
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity Status</h3>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_entry, index) => (
                <Cell key={index} fill="#6b5ce7" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
