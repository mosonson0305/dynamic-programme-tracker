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

  // Track which activities have manually-set SNET (from WBS edit)
  // These activities' startDate should be preserved, not overwritten by CPM.
  const manualStartDates = new Map<string, string>()
  for (const a of cloned) {
    if (a.constraintType === 'SNET' && a.constraintDate) {
      manualStartDates.set(a.id, a.constraintDate)
    } else if (!a.constraintType || a.constraintType === 'ASAP') {
      // For activities with no deps and a startDate, inject SNET
      const hasDeps = dependencies.some(d => d.successorId === a.id)
      if (!hasDeps && a.startDate) {
        manualStartDates.set(a.id, a.startDate)
        a.constraintType = 'SNET'
        a.constraintDate = a.startDate
      }
    }
  }

  const earlyDates = forwardPass(cloned, dependencies, start)

  let projectFinish = start
  for (const [, ed] of earlyDates) {
    if (ed.earlyFinish > projectFinish) {
      projectFinish = ed.earlyFinish
    }
  }

  const lateDates = backwardPass(cloned, dependencies, earlyDates, projectFinish)
  const floatInfo = calculateFloat(cloned, earlyDates, lateDates)
  const criticalPath = identifyCriticalPath(cloned, floatInfo)

  for (const a of cloned) {
    const early = earlyDates.get(a.id)
    const late = lateDates.get(a.id)
    const fi = floatInfo.get(a.id)

    if (early) {
      a.earlyStart = early.earlyStart
      a.earlyFinish = early.earlyFinish

      // If this activity has a manual SNET date, keep it — don't let CPM overwrite
      const manualDate = manualStartDates.get(a.id)
      if (manualDate) {
        a.startDate = manualDate
        // Recalculate finish from manual start + duration
        a.finishDate = early.earlyFinish
        // But if manual finish was also set, use that
        const origAct = activities.find(act => act.id === a.id)
        if (origAct?.finishDate && origAct.finishDate !== early.earlyFinish) {
          a.finishDate = origAct.finishDate
        }
      } else {
        a.startDate = early.earlyStart
        a.finishDate = early.earlyFinish
      }
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

  // Also consider manual finishDates for projectFinish
  for (const a of cloned) {
    if (a.finishDate && a.finishDate > projectFinish) {
      projectFinish = a.finishDate
    }
  }

  return {
    activities: cloned,
    criticalPath,
    projectFinish,
    floatInfo,
  }
}