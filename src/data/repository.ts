import type { Activity, Baseline, Dependency, Project } from '../models'

export interface IProgrammeRepository {
  getProject(id: string): Promise<Project | undefined>
  createProject(project: Project): Promise<string>
  getActivities(projectId: string): Promise<Activity[]>
  createActivity(activity: Activity): Promise<string>
  updateActivity(activity: Activity): Promise<string>
  deleteActivity(id: string): Promise<void>
  getDependencies(projectId: string): Promise<Dependency[]>
  createDependency(dependency: Dependency): Promise<string>
  deleteDependency(id: string): Promise<void>
  getBaselines(projectId: string): Promise<Baseline[]>
  createBaseline(baseline: Baseline): Promise<string>
  deleteBaseline(id: string): Promise<void>
}
