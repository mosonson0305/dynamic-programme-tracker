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

  // Inject SNET for ALL activities that have an explicit startDate from CSV/import.
  // This preserves the user's intended dates — CPM will still calculate float and
  // critical path, but won't overwrite start dates that were explicitly provided.
  const manualStartDates = new Map<string, string>()
  for (const a of cloned) {
    if (a.startDate) {
      manualStartDates.set(a.id, a.startDate)
      a.constraintType = 'SNET'
      a.constraintDate = a.startDate
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

      // If this activity has a manual SNET date, preserve both
      // startDate and finishDate so the user's edit is retained.
      // Downstream activities have already been recalculated.
      const manualDate = manualStartDates.get(a.id)
      if (manualDate) {
        const origAct = activities.find(act => act.id === a.id)
        a.startDate = manualDate
        // Preserve manual finish if explicitly set, else CPM-computed
        if (origAct?.finishDate && origAct.finishDate !== early.earlyFinish) {
          a.finishDate = origAct.finishDate
        } else {
          a.finishDate = early.earlyFinish
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