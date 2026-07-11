import type { Activity, Dependency } from '../../models'

/** Task shape consumed by Frappe Gantt */
export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies: string[]
  custom_class: string
}

/**
 * Transform store activities + dependencies into Frappe Gantt task format.
 * Critical activities get custom_class 'critical', milestones get 'milestone'.
 */
export function activitiesToGanttTasks(
  activities: Activity[],
  dependencies: Dependency[],
): GanttTask[] {
  // Build mapping: activity id → list of predecessor ids
  const predMap = new Map<string, string[]>()
  for (const dep of dependencies) {
    const list = predMap.get(dep.successorId) || []
    list.push(dep.predecessorId)
    predMap.set(dep.successorId, list)
  }

  return activities.map((a) => {
    let customClass = ''
    if (a.isCritical) customClass = 'critical'
    if (a.isMilestone) customClass = customClass ? `${customClass} milestone` : 'milestone'

    return {
      id: a.id,
      name: `${a.wbsCode} ${a.name}`,
      start: a.startDate || '',
      end: a.finishDate || '',
      progress: a.percentComplete,
      dependencies: predMap.get(a.id) || [],
      custom_class: customClass,
    }
  })
}
