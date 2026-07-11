import type { Activity, Dependency } from '../models'
import { forwardPass, backwardPass, calculateFloat, identifyCriticalPath } from './cpm'
import type { EarlyDates, LateDates, FloatInfo } from './cpm'
import { todayStr } from '../utils/date-utils'

export interface ScheduleResult {
  /** Input activities deeply cloned and updated with computed dates */
  activities: Activity[]
  /** Critical path activity IDs in order */
  criticalPath: string[]
  /** Project finish date (YYYY-MM-DD) */
  projectFinish: string
  /** Float info for each activity */
  floatInfo: Map<string, FloatInfo>
}

/**
 * Run the full CPM schedule computation.
 *
 * 1. Forward pass → Early Start / Early Finish
 * 2. Backward pass → Late Start / Late Finish
 * 3. Float calculation → total float + critical flag
 * 4. Critical path identification
 *
 * Deep clones input activities before mutating so callers are not affected.
 *
 * @param activities   Array of project activities
 * @param dependencies Array of dependencies between activities
 * @param projectStart Project start date (defaults to today)
 * @returns ScheduleResult with updated activities, critical path, finish date, and float info
 */
export function schedule(
  activities: Activity[],
  dependencies: Dependency[],
  projectStart?: string,
): ScheduleResult {
  const start = projectStart ?? todayStr()

  if (activities.length === 0) {
    return {
      activities: [],
      criticalPath: [],
      projectFinish: start,
      floatInfo: new Map(),
    }
  }

  // Deep clone activities to avoid mutating inputs
  const cloned: Activity[] = activities.map((a) => ({ ...a }))

  // Forward pass
  const earlyDates = forwardPass(cloned, dependencies, start)

  // Find project finish (max early finish across all activities)
  let projectFinish = start
  for (const [, ed] of earlyDates) {
    if (ed.earlyFinish > projectFinish) {
      projectFinish = ed.earlyFinish
    }
  }

  // Backward pass
  const lateDates = backwardPass(cloned, dependencies, earlyDates, projectFinish)

  // Float calculation
  const floatInfo = calculateFloat(cloned, earlyDates, lateDates)

  // Critical path
  const criticalPath = identifyCriticalPath(cloned, floatInfo)

  // Update cloned activities with computed dates
  for (const a of cloned) {
    const early = earlyDates.get(a.id)
    const late = lateDates.get(a.id)
    const fi = floatInfo.get(a.id)

    if (early) {
      a.startDate = early.earlyStart
      a.finishDate = early.earlyFinish
      a.earlyStart = early.earlyStart
      a.earlyFinish = early.earlyFinish
    }

    if (late) {
      a.lateStart = late.lateStart
      a.lateFinish = late.lateFinish
    }

    if (fi) {
      a.totalFloat = fi.totalFloat
      a.isCritical = fi.isCritical
    }
  }

  return {
    activities: cloned,
    criticalPath,
    projectFinish,
    floatInfo,
  }
}
