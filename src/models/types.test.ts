import { describe, it, expect } from 'vitest'
import type { Activity, Dependency, Baseline, BaselineSnapshotActivity, Project, ConstraintType, ActivityStatus, RelationType } from './index'

describe('Type definitions', () => {
  it('Activity type should have all required fields', () => {
    const a: Activity = {
      id: '1',
      projectId: 'p1',
      wbsCode: '1.1',
      name: 'Test Activity',
      parentId: null,
      duration: 10,
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
      wbsLevel: 2,
      bimRef: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    expect(a.name).toBe('Test Activity')
  })

  it('ConstraintType should accept valid values', () => {
    const asap: ConstraintType = 'ASAP'
    const alap: ConstraintType = 'ALAP'
    const snet: ConstraintType = 'SNET'
    const fnet: ConstraintType = 'FNET'
    expect(asap).toBe('ASAP')
    expect(alap).toBe('ALAP')
    expect(snet).toBe('SNET')
    expect(fnet).toBe('FNET')
  })

  it('ActivityStatus should accept valid values', () => {
    const notStarted: ActivityStatus = 'not_started'
    const inProgress: ActivityStatus = 'in_progress'
    const completed: ActivityStatus = 'completed'
    const delayed: ActivityStatus = 'delayed'
    expect(notStarted).toBe('not_started')
    expect(inProgress).toBe('in_progress')
    expect(completed).toBe('completed')
    expect(delayed).toBe('delayed')
  })

  it('Dependency should have predecessor and successor', () => {
    const d: Dependency = {
      id: 'd1',
      projectId: 'p1',
      predecessorId: 'a1',
      successorId: 'a2',
      relationType: 'FS',
      lagDays: 0,
    }
    expect(d.relationType).toBe('FS')
  })

  it('RelationType should accept valid values', () => {
    const fs: RelationType = 'FS'
    const ss: RelationType = 'SS'
    const ff: RelationType = 'FF'
    const sf: RelationType = 'SF'
    expect(fs).toBe('FS')
    expect(ss).toBe('SS')
    expect(ff).toBe('FF')
    expect(sf).toBe('SF')
  })

  it('Baseline should have snapshot with activities', () => {
    const snapActivity: BaselineSnapshotActivity = {
      id: 'a1',
      wbsCode: '1.1',
      name: 'Task',
      duration: 5,
      startDate: '2026-01-01',
      finishDate: '2026-01-06',
      isCritical: false,
    }

    const b: Baseline = {
      id: 'b1',
      projectId: 'p1',
      name: 'Contract Baseline',
      type: 'contract',
      createdAt: '2026-01-01',
      snapshot: {
        activities: [snapActivity],
      },
    }
    expect(b.name).toBe('Contract Baseline')
    expect(b.snapshot.activities).toHaveLength(1)
  })

  it('Baseline type should accept valid values', () => {
    const contract: Baseline['type'] = 'contract'
    const revised: Baseline['type'] = 'revised'
    const working: Baseline['type'] = 'working'
    const imported: Baseline['type'] = 'imported'
    expect(contract).toBe('contract')
    expect(revised).toBe('revised')
    expect(working).toBe('working')
    expect(imported).toBe('imported')
  })

  it('Project should have required fields', () => {
    const p: Project = {
      id: 'p1',
      name: 'My Project',
      dataDate: '2026-07-11',
      description: '',
      createdAt: '2026-07-11',
      updatedAt: '2026-07-11',
    }
    expect(p.name).toBe('My Project')
  })
})
