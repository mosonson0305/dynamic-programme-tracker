import { useEffect, useRef } from 'react'
import Gantt from 'frappe-gantt'
import { useProgrammeStore } from '../../store/programmeStore'
import type { GanttTask } from './gantt-utils'
import { activitiesToGanttTasks } from './gantt-utils'
import './gantt.css'

export default function GanttView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<Gantt | null>(null)
  const activities = useProgrammeStore((s) => s.activities)
  const dependencies = useProgrammeStore((s) => s.dependencies)

  useEffect(() => {
    if (!containerRef.current) return
    if (activities.length === 0) {
      ganttRef.current = null
      return
    }

    const tasks: GanttTask[] = activitiesToGanttTasks(activities, dependencies)

    if (ganttRef.current) {
      ganttRef.current.refresh(tasks)
    } else {
      ganttRef.current = new Gantt(containerRef.current, tasks, {
        view_mode: 'Month',
        date_format: 'YYYY-MM-DD',
        bar_height: 24,
      })
    }

    return () => {
      // Cleanup handled by DOM removal on unmount
    }
  }, [activities, dependencies])

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No activities. Import a CSV to see the Gantt chart.
      </div>
    )
  }

  return <div ref={containerRef} className="gantt-container" />
}
