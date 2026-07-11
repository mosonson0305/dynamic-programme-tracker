import Dexie, { type EntityTable } from 'dexie'
import type { Activity, Dependency, Baseline, Project } from '../models'

export class ProgrammeDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  activities!: EntityTable<Activity, 'id'>
  dependencies!: EntityTable<Dependency, 'id'>
  baselines!: EntityTable<Baseline, 'id'>

  constructor() {
    super('programmeTracker')
    this.version(1).stores({
      projects: 'id, name',
      activities: 'id, projectId, wbsCode, status, isCritical',
      dependencies: 'id, projectId, predecessorId, successorId, [projectId+successorId]',
      baselines: 'id, projectId, type, createdAt',
    })
  }
}

export const db = new ProgrammeDB()
