import { describe, it, expect } from 'vitest'
import { forwardPass, backwardPass, calculateFloat, identifyCriticalPath } from './cpm'
import type { Activity, Dependency } from '../models'

function makeActivity(id: string, duration = 5, projectId = 'p1'): Activity {
  return {
    id,
    projectId,
    wbsCode: id,
    name: `Activity ${id}`,
    parentId: null,
    duration,
    startDate: null,
    finishDate: null,
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    earlyStart: null,
    earlyFinish: null,
    lateStart: null,
    lateFinish: null,
    totalFloat: 0,
    isCritical: false,
    isMilestone: false,
    constraintType: 'ASAP',
    constraintDate: null,
    status: 'not_started',
    wbsLevel: 1,
    bimRef: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

function makeDep(id: string, predId: string, succId: string, rel: 'FS' | 'SS' | 'FF' | 'SF' = 'FS', lag = 0): Dependency {
  return {
    id,
    projectId: 'p1',
    predecessorId: predId,
    successorId: succId,
    relationType: rel,
    lagDays: lag,
  }
}

describe('forwardPass', () => {
  const projectStart = '2026-07-01'

  it('single activity with project start', () => {
    const activities: Activity[] = [makeActivity('A', 10)]
    const deps: Dependency[] = []
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A')).toEqual({
      earlyStart: '2026-07-01',
      earlyFinish: '2026-07-11',
    })
  })

  it('FS: successor starts after predecessor finishes', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FS')]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A')).toEqual({
      earlyStart: '2026-07-01',
      earlyFinish: '2026-07-11',
    })
    expect(result.get('B')).toEqual({
      earlyStart: '2026-07-11',
      earlyFinish: '2026-07-16',
    })
  })

  it('FS with lag: B starts after A finish + lag days', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FS', 3)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A').earlyStart).toBe('2026-07-01')
    expect(result.get('A').earlyFinish).toBe('2026-07-11')
    expect(result.get('B').earlyStart).toBe('2026-07-14')
    expect(result.get('B').earlyFinish).toBe('2026-07-19')
  })

  it('SS: successor starts when predecessor starts', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SS')]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A').earlyStart).toBe('2026-07-01')
    expect(result.get('B').earlyStart).toBe('2026-07-01')
    expect(result.get('B').earlyFinish).toBe('2026-07-06')
  })

  it('SS with lag: B starts after A start + lag', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SS', 4)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('B').earlyStart).toBe('2026-07-05')
    expect(result.get('B').earlyFinish).toBe('2026-07-10')
  })

  it('FF: successor finishes when predecessor finishes', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FF')]
    const result = forwardPass(activities, deps, projectStart)

    // B finishes when A finishes (2026-07-11), so B starts at EF - duration = 2026-07-06
    expect(result.get('B').earlyFinish).toBe('2026-07-11')
    expect(result.get('B').earlyStart).toBe('2026-07-06')
  })

  it('FF with lag: B finishes after A finish + lag', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FF', 3)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('B').earlyFinish).toBe('2026-07-14')
    expect(result.get('B').earlyStart).toBe('2026-07-09')
  })

  it('SF: successor finishes when predecessor starts', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SF')]
    const result = forwardPass(activities, deps, projectStart)

    // B finishes when A starts (2026-07-01), so B starts at EF - duration = 2026-06-26
    expect(result.get('B').earlyFinish).toBe('2026-07-01')
    expect(result.get('B').earlyStart).toBe('2026-06-26')
  })

  it('SF with lag: B finishes after A start + lag', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SF', 2)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('B').earlyFinish).toBe('2026-07-03')
    expect(result.get('B').earlyStart).toBe('2026-06-28')
  })

  it('takes max ES from multiple predecessors', () => {
    // A (10 days) → C, B (20 days) → C
    // C should start after both A and B finish (FS)
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 20),
      makeActivity('C', 5),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C', 'FS'),
      makeDep('d2', 'B', 'C', 'FS'),
    ]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A').earlyFinish).toBe('2026-07-11')
    expect(result.get('B').earlyFinish).toBe('2026-07-21')
    // C should start after B finishes (later)
    expect(result.get('C').earlyStart).toBe('2026-07-21')
    expect(result.get('C').earlyFinish).toBe('2026-07-26')
  })

  it('takes max ES from multiple predecessors with different relation types', () => {
    // A (10 days, FS) → C, B (20 days, SS + lag 5) → C
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 20),
      makeActivity('C', 5),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C', 'FS'),
      makeDep('d2', 'B', 'C', 'SS', 5),
    ]
    const result = forwardPass(activities, deps, projectStart)

    // A FS: C.ES >= A.EF = 2026-07-11
    // B SS+5: C.ES >= B.ES + 5 = 2026-07-01 + 5 = 2026-07-06
    // Max = 2026-07-11
    expect(result.get('C').earlyStart).toBe('2026-07-11')
  })
})

describe('backwardPass', () => {
  const projectStart = '2026-07-01'

  it('sets late dates to project finish for terminal activities', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FS')]
    const earlyDates = forwardPass(activities, deps, projectStart)
    // A: 07-01 to 07-11, B: 07-11 to 07-16
    const projectFinish = '2026-07-16'

    const result = backwardPass(activities, deps, earlyDates, projectFinish)

    // Terminal activity B: LS = LF - duration = 07-16 - 5 = 07-11
    expect(result.get('B')).toEqual({
      lateStart: '2026-07-11',
      lateFinish: '2026-07-16',
    })
    // A: LF = B.LS = 07-11, LS = LF - 10 = 07-01
    expect(result.get('A')).toEqual({
      lateStart: '2026-07-01',
      lateFinish: '2026-07-11',
    })
  })

  it('handles multiple successors (min of successor late starts)', () => {
    // A → B (5 days), A → C (15 days)
    // Forward: A(07-01 to 07-11), B(07-11 to 07-16), C(07-11 to 07-26)
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
      makeActivity('C', 15),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B', 'FS'),
      makeDep('d2', 'A', 'C', 'FS'),
    ]
    const earlyDates = forwardPass(activities, deps, projectStart)
    // B finishes 07-16, C finishes 07-26 → projectFinish = 07-26
    const projectFinish = '2026-07-26'

    const result = backwardPass(activities, deps, earlyDates, projectFinish)

    // C (terminal): LS = 07-26 - 15 = 07-11
    expect(result.get('C').lateStart).toBe('2026-07-11')
    // B (terminal): LS = 07-26 - 5 = 07-21 (must finish by project finish)
    expect(result.get('B').lateStart).toBe('2026-07-21')
    // A: LF = min(B.LS, C.LS) = min(07-21, 07-11) = 07-11
    expect(result.get('A').lateFinish).toBe('2026-07-11')
    expect(result.get('A').lateStart).toBe('2026-07-01')
  })
})

describe('calculateFloat', () => {
  it('returns zero float for all activities in simple chain', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
      makeActivity('C', 3),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B', 'FS'),
      makeDep('d2', 'B', 'C', 'FS'),
    ]
    const earlyDates = forwardPass(activities, deps, '2026-07-01')
    const projectFinish = forwardPass(activities, deps, '2026-07-01').get('C')!.earlyFinish
    const lateDates = backwardPass(activities, deps, earlyDates, projectFinish)

    const float = calculateFloat(activities, earlyDates, lateDates)

    expect(float.get('A')!.totalFloat).toBe(0)
    expect(float.get('A')!.isCritical).toBe(true)
    expect(float.get('B')!.totalFloat).toBe(0)
    expect(float.get('B')!.isCritical).toBe(true)
    expect(float.get('C')!.totalFloat).toBe(0)
    expect(float.get('C')!.isCritical).toBe(true)
  })

  it('returns positive float for shorter branch', () => {
    // A(10) → C(5)
    // B(3)  → C(5)  (B is shorter, has float)
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 3),
      makeActivity('C', 5),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C', 'FS'),
      makeDep('d2', 'B', 'C', 'FS'),
    ]
    const earlyDates = forwardPass(activities, deps, '2026-07-01')
    const projectFinish = earlyDates.get('C')!.earlyFinish
    const lateDates = backwardPass(activities, deps, earlyDates, projectFinish)

    const float = calculateFloat(activities, earlyDates, lateDates)

    // A: long path, critical
    expect(float.get('A')!.totalFloat).toBe(0)
    expect(float.get('A')!.isCritical).toBe(true)
    // C: also critical (on longest path)
    expect(float.get('C')!.totalFloat).toBe(0)
    expect(float.get('C')!.isCritical).toBe(true)
    // B: shorter, has float
    expect(float.get('B')!.totalFloat).toBeGreaterThan(0)
    expect(float.get('B')!.isCritical).toBe(false)
  })
})

describe('identifyCriticalPath', () => {
  it('returns all activities in order for simple chain', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
      makeActivity('C', 3),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B', 'FS'),
      makeDep('d2', 'B', 'C', 'FS'),
    ]
    const earlyDates = forwardPass(activities, deps, '2026-07-01')
    const projectFinish = earlyDates.get('C')!.earlyFinish
    const lateDates = backwardPass(activities, deps, earlyDates, projectFinish)
    const float = calculateFloat(activities, earlyDates, lateDates)

    const path = identifyCriticalPath(activities, float)

    expect(path).toEqual(['A', 'B', 'C'])
  })

  it('returns only the longest path when there are branches', () => {
    // A(10) → C(5)   [critical: total 15]
    // B(3)  → C(5)   [non-critical: total 8]
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 3),
      makeActivity('C', 5),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C', 'FS'),
      makeDep('d2', 'B', 'C', 'FS'),
    ]
    const earlyDates = forwardPass(activities, deps, '2026-07-01')
    const projectFinish = earlyDates.get('C')!.earlyFinish
    const lateDates = backwardPass(activities, deps, earlyDates, projectFinish)
    const float = calculateFloat(activities, earlyDates, lateDates)

    const path = identifyCriticalPath(activities, float)

    expect(path).toContain('A')
    expect(path).toContain('C')
    expect(path).not.toContain('B')
    expect(path).toEqual(['A', 'C'])
  })
})
