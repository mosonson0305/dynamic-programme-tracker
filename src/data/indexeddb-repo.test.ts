import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { IndexedDBRepository } from './indexeddb-repo'
import type { IProgrammeRepository } from './repository'
import type { Project, Activity } from '../models'

describe('IndexedDBRepository', () => {
  let repo: IProgrammeRepository

  beforeEach(async () => {
    repo = new IndexedDBRepository()
    // Clear all data between tests
    const db = (repo as IndexedDBRepository).db
    await db.delete()
    await db.open()
  })

  async function seedProject(): Promise<Project> {
    const project: Project = {
      id: 'p1',
      name: 'Test Project',
      dataDate: '2026-07-11',
      description: '',
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    }
    await repo.createProject(project)
    return project
  }

  it('should create and retrieve activities (roundtrip)', async () => {
    await seedProject()

    const activity: Activity = {
      id: 'a1',
      projectId: 'p1',
      wbsCode: '1.1',
      name: 'Foundation',
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
      wbsLevel: 1,
      bimRef: null,
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    }

    await repo.createActivity(activity)

    const activities = await repo.getActivities('p1')
    expect(activities).toHaveLength(1)
    expect(activities[0].id).toBe('a1')
    expect(activities[0].name).toBe('Foundation')
    expect(activities[0].wbsCode).toBe('1.1')
  })

  it('should update an activity', async () => {
    await seedProject()

    const activity: Activity = {
      id: 'a2',
      projectId: 'p1',
      wbsCode: '2.1',
      name: 'Original Name',
      parentId: null,
      duration: 5,
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
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    }

    await repo.createActivity(activity)

    // Update the activity
    const updated: Activity = {
      ...activity,
      name: 'Updated Name',
      percentComplete: 50,
    }
    await repo.updateActivity(updated)

    const activities = await repo.getActivities('p1')
    expect(activities).toHaveLength(1)
    expect(activities[0].name).toBe('Updated Name')
    expect(activities[0].percentComplete).toBe(50)
  })
})
