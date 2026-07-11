import type { Activity, Dependency } from '../models'
import { topologicalSort } from './topo'
import { addDays, daysBetween } from '../utils/date-utils'

export interface EarlyDates {
  earlyStart: string
  earlyFinish: string
}

export interface LateDates {
  lateStart: string
  lateFinish: string
}

export interface FloatInfo {
  totalFloat: number
  isCritical: boolean
}

// ─── Forward Pass ────────────────────────────────────────────────

/**
 * Forward pass: calculate Early Start and Early Finish for all activities.
 * Supports FS, SS, FF, SF relation types with lag.
 */
export function forwardPass(
  activities: Activity[],
  dependencies: Dependency[],
  projectStart: string,
): Map<string, EarlyDates> {
  const order = topologicalSort(activities, dependencies)
  const dates = new Map<string, EarlyDates>()
  const durMap = new Map(activities.map((a) => [a.id, a.duration]))

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

    const esCandidates: string[] = []
    const efCandidates: string[] = []

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
      ef = efCandidates.reduce((a, b) => (a > b ? a : b))
      es = addDays(ef, -duration)
    } else {
      es = esCandidates.length > 0
        ? esCandidates.reduce((a, b) => (a > b ? a : b))
        : projectStart
      ef = addDays(es, duration)

      if (efCandidates.length > 0) {
        const maxEfCandidate = efCandidates.reduce((a, b) => (a > b ? a : b))
        if (maxEfCandidate > ef) {
          ef = maxEfCandidate
        }
      }
    }

    dates.set(id, { earlyStart: es, earlyFinish: ef })
  }

  return dates
}

// ─── Backward Pass ───────────────────────────────────────────────

/**
 * Backward pass: calculate Late Start and Late Finish for all activities.
 * Processes activities in reverse topological order.
 */
export function backwardPass(
  activities: Activity[],
  dependencies: Dependency[],
  _earlyDates: Map<string, EarlyDates>,
  projectFinish: string,
): Map<string, LateDates> {
  const order = topologicalSort(activities, dependencies)
  const reverseOrder = [...order].reverse()

  const durMap = new Map(activities.map((a) => [a.id, a.duration]))
  const lateDates = new Map<string, LateDates>()

  const succMap = new Map<string, Dependency[]>()
  for (const dep of dependencies) {
    const existing = succMap.get(dep.predecessorId) ?? []
    existing.push(dep)
    succMap.set(dep.predecessorId, existing)
  }

  for (const id of reverseOrder) {
    const duration = durMap.get(id) ?? 0
    const succs = succMap.get(id)

    let lf = projectFinish

    if (succs && succs.length > 0) {
      for (const dep of succs) {
        const succLate = lateDates.get(dep.successorId)
        if (!succLate) continue

        switch (dep.relationType) {
          case 'FS': {
            const constraint = addDays(succLate.lateStart, -dep.lagDays)
            if (constraint < lf) lf = constraint
            break
          }
          case 'FF': {
            const constraint = addDays(succLate.lateFinish, -dep.lagDays)
            if (constraint < lf) lf = constraint
            break
          }
        }
      }
    }

    let ls = addDays(lf, -duration)

    if (succs && succs.length > 0) {
      for (const dep of succs) {
        const succLate = lateDates.get(dep.successorId)
        if (!succLate) continue

        switch (dep.relationType) {
          case 'SS': {
            const constraint = addDays(succLate.lateStart, -dep.lagDays)
            if (constraint < ls) ls = constraint
            break
          }
          case 'SF': {
            const constraint = addDays(succLate.lateFinish, -dep.lagDays)
            if (constraint < ls) ls = constraint
            break
          }
        }
      }
    }

    // Reconcile: LF must be >= LS + duration
    const lfCandidate = addDays(ls, duration)
    if (lfCandidate > lf) lf = lfCandidate

    lateDates.set(id, { lateStart: ls, lateFinish: lf })
  }

  return lateDates
}

// ─── Float & Critical Path ───────────────────────────────────────

/**
 * Calculate total float and identify critical activities.
 * totalFloat = LS - ES (in days).
 * isCritical when totalFloat === 0.
 */
export function calculateFloat(
  activities: Activity[],
  earlyDates: Map<string, EarlyDates>,
  lateDates: Map<string, LateDates>,
): Map<string, FloatInfo> {
  const float = new Map<string, FloatInfo>()

  for (const a of activities) {
    const early = earlyDates.get(a.id)
    const late = lateDates.get(a.id)
    if (!early || !late) continue

    const totalFloat = daysBetween(early.earlyStart, late.lateStart)
    float.set(a.id, {
      totalFloat,
      isCritical: totalFloat === 0,
    })
  }

  return float
}

/**
 * Identify the critical path by returning critical activity IDs in topological order.
 */
export function identifyCriticalPath(
  activities: Activity[],
  floatInfo: Map<string, FloatInfo>,
): string[] {
  const criticalIds = new Set(
    activities.filter((a) => floatInfo.get(a.id)?.isCritical).map((a) => a.id),
  )

  if (criticalIds.size === 0) return []

  // Use topological sort to order critical activities
  const criticalActivities = activities.filter((a) => criticalIds.has(a.id))
  const order = topologicalSort(criticalActivities, [])

  return order.filter((id) => criticalIds.has(id))
}
