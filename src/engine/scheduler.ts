import type { Activity, Dependency } from '../models'
import { forwardPass, backwardPass, calculateFloat, identifyCriticalPath } from './cpm'
import type { FloatInfo } from './cpm'
import { todayStr } from '../utils/date-utils'

export interface ScheduleResult {
  activities: Activity[]
  criticalPath: string[]
  projectFinish: string
  floatInfo: Map<string, FloatInfo>
}

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

  const cloned: Activity[] = activities.map((a) => ({ ...a }))

  // Build set of activity IDs that have dependencies
  const hasDeps = new Set<string>()
  for (const d of dependencies) {
    hasDeps.add(d.successorId)
  }

  // For activities with NO dependencies that have imported dates,
  // inject the imported startDate as the project start override
  // so forward pass can use it.
  // We temporarily set constraintType to SNET to force the forward pass
  // to respect the date.
  const savedConstraints = new Map<string, { ct: string; cd: string | null }>()
  for (const a of cloned) {
    if (!hasDeps.has(a.id) && a.startDate) {
      savedConstraints.set(a.id, { ct: a.constraintType, cd: a.constraintDate })
      a.constraintType = 'SNET'
      a.constraintDate = a.startDate
    }
  }

  // Forward pass
  const earlyDates = forwardPass(cloned, dependencies, start)

  // Restore constraints
  for (const a of cloned) {
    const saved = savedConstraints.get(a.id)
    if (saved) {
      a.constraintType = saved.ct as Activity['constraintType']
      a.constraintDate = saved.cd
    }
  }

  // Find project finish
  let projectFinish = start
  for (const [, ed] of earlyDates) {
    if (ed.earlyFinish > projectFinish) {
      projectFinish = ed.earlyFinish
    }
  }

  // Backward pass
  const lateDates = backwardPass(cloned, dependencies, earlyDates, projectFinish)
  const floatInfo = calculateFloat(cloned, earlyDates, lateDates)
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
