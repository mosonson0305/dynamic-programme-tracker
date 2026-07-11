import { db } from './db'
import type { IProgrammeRepository } from './repository'
import type { Activity, Baseline, Dependency, Project } from '../models'

export class IndexedDBRepository implements IProgrammeRepository {
  get db() {
    return db
  }

  async getProject(id: string): Promise<Project | undefined> {
    return db.projects.get(id)
  }

  async createProject(project: Project): Promise<string> {
    return db.projects.add(project)
  }

  async getActivities(projectId: string): Promise<Activity[]> {
    return db.activities.where('projectId').equals(projectId).toArray()
  }

  async createActivity(activity: Activity): Promise<string> {
    return db.activities.add(activity)
  }

  async updateActivity(activity: Activity): Promise<string> {
    return db.activities.put(activity)
  }

  async deleteActivity(id: string): Promise<void> {
    return db.activities.delete(id)
  }

  async getDependencies(projectId: string): Promise<Dependency[]> {
    return db.dependencies.where('projectId').equals(projectId).toArray()
  }

  async createDependency(dependency: Dependency): Promise<string> {
    return db.dependencies.add(dependency)
  }

  async deleteDependency(id: string): Promise<void> {
    return db.dependencies.delete(id)
  }

  async getBaselines(projectId: string): Promise<Baseline[]> {
    return db.baselines.where('projectId').equals(projectId).toArray()
  }

  async createBaseline(baseline: Baseline): Promise<string> {
    return db.baselines.add(baseline)
  }

  async deleteBaseline(id: string): Promise<void> {
    return db.baselines.delete(id)
  }
}
