import type { Activity, Dependency } from '../models'
import { topologicalSort } from './topo'
import { addDays } from '../utils/date-utils'

export interface EarlyDates {
  earlyStart: string
  earlyFinish: string
}

/**
 * Forward pass: calculate Early Start and Early Finish for all activities.
 * Supports FS, SS, FF, SF relation types with lag.
 *
 * Constraints:
 *   FS: ES_succ >= EF_pred + lag
 *   SS: ES_succ >= ES_pred + lag
 *   FF: EF_succ >= EF_pred + lag
 *   SF: EF_succ >= ES_pred + lag
 * Plus: EF >= ES + duration (internal integrity)
 */
export function forwardPass(
  activities: Activity[],
  dependencies: Dependency[],
  projectStart: string,
): Map<string, EarlyDates> {
  const order = topologicalSort(activities, dependencies)
  const dates = new Map<string, EarlyDates>()
  const durMap = new Map(activities.map((a) => [a.id, a.duration]))

  // Build predecessor map for efficient lookup
  const predMap = new Map<string, Dependency[]>()
  for (const dep of dependencies) {
    const existing = predMap.get(dep.successorId) ?? []
    existing.push(dep)
    predMap.set(dep.successorId, existing)
  }

  for (const id of order) {
    const duration = durMap.get(id) ?? 0
    const preds = predMap.get(id)

    if (!preds || preds.length === 0) {
      const es = projectStart
      const ef = addDays(es, duration)
      dates.set(id, { earlyStart: es, earlyFinish: ef })
      continue
    }

    // Collect lower-bound candidates from each predecessor
    const esCandidates: string[] = [] // from FS, SS
    const efCandidates: string[] = [] // from FF, SF

    for (const dep of preds) {
      const predDates = dates.get(dep.predecessorId)
      if (!predDates) continue

      switch (dep.relationType) {
        case 'FS':
          esCandidates.push(addDays(predDates.earlyFinish, dep.lagDays))
          break
        case 'SS':
          esCandidates.push(addDays(predDates.earlyStart, dep.lagDays))
          break
        case 'FF':
          efCandidates.push(addDays(predDates.earlyFinish, dep.lagDays))
          break
        case 'SF':
          efCandidates.push(addDays(predDates.earlyStart, dep.lagDays))
          break
      }
    }

    let es: string
    let ef: string

    if (esCandidates.length === 0 && efCandidates.length > 0) {
      // Pure FF/SF: finish date is constrained, start derives backward
      ef = efCandidates.reduce((a, b) => (a > b ? a : b))
      es = addDays(ef, -duration)
    } else {
      // FS/SS constraints (or mixed): start date is constrained first
      es = esCandidates.length > 0
        ? esCandidates.reduce((a, b) => (a > b ? a : b))
        : projectStart
      ef = addDays(es, duration)

      // FF/SF constraints may push finish date forward
      if (efCandidates.length > 0) {
        const maxEfCandidate = efCandidates.reduce((a, b) => (a > b ? a : b))
        if (maxEfCandidate > ef) {
          ef = maxEfCandidate
          // Keep ES as-is (it's constrained by FS/SS or projectStart)
        }
      }
    }

    dates.set(id, { earlyStart: es, earlyFinish: ef })
  }

  return dates
}
