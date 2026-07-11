import { useLayoutEffect, useRef } from 'react'
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

  useLayoutEffect(() => {
    if (!containerRef.current) return

    // Clear the container so Frappe Gantt gets a fresh DOM
    containerRef.current.innerHTML = ''

    if (activities.length === 0) {
      ganttRef.current = null
      return
    }

    const tasks: GanttTask[] = activitiesToGanttTasks(activities, dependencies)

    try {
      ganttRef.current = new Gantt(containerRef.current, tasks, {
        view_mode: 'Month',
        date_format: 'YYYY-MM-DD',
        bar_height: 24,
      })
    } catch (err) {
      console.error('Frappe Gantt init error:', err)
    }

    return () => {
      // Cleanup on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      ganttRef.current = null
    }
  }, [activities, dependencies])

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No activities. Import a CSV to see the Gantt chart.
      </div>
    )
  }

  return (
    <div className="gantt-container">
      <div ref={containerRef} />
    </div>
  )
}
