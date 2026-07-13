import { create } from 'zustand'
import type { Activity, Dependency, Baseline, Project } from '../models'
import { IndexedDBRepository } from '../data/indexeddb-repo'
import { db } from '../data/db'
import { schedule, type ScheduleResult } from '../engine/scheduler'
import { parseProgrammeCSV } from '../utils/csv-parser'
import { addDays } from '../utils/date-utils'

interface ProgrammeState {
  // Data
  project: Project | null
  activities: Activity[]
  dependencies: Dependency[]
  baselines: Baseline[]
  scheduleResult: ScheduleResult | null
  warnings: string[]

  // UI state
  activeTab: 'gantt' | 'dashboard' | 'compare' | 'wbs' | 'csv' | 'export'
  isLoading: boolean
  error: string | null

  // Actions
  setActiveTab: (tab: ProgrammeState['activeTab']) => void
  importCSV: (csvText: string, projectName: string, dataDate: string) => Promise<void>
  runSchedule: (projectStart?: string) => void
  loadFromDB: (projectId: string) => Promise<void>
}

const repo = new IndexedDBRepository()

export const useProgrammeStore = create<ProgrammeState>((set, get) => ({
  project: null,
  activities: [],
  dependencies: [],
  baselines: [],
  scheduleResult: null,
  warnings: [],
  activeTab: 'csv',
  isLoading: false,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  importCSV: async (csvText, projectName, dataDate) => {
    set({ isLoading: true, error: null })
    try {
      const projectId = crypto.randomUUID()
      const project: Project = {
        id: projectId,
        name: projectName,
        dataDate,
        description: '',
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      }

      await repo.createProject(project)

      const parsed = parseProgrammeCSV(csvText, projectId)

      // Auto-create baseline if dates present and dependencies exist
      const hasDates = parsed.activities.some(a => a.startDate || a.finishDate)
      const hasDeps = parsed.dependencies.length > 0

      if (hasDates && hasDeps) {
        const baseline: Baseline = {
          id: crypto.randomUUID(),
          projectId,
          name: 'Imported Baseline',
          type: 'imported',
          createdAt: new Date().toISOString().slice(0, 10),
          snapshot: {
            activities: parsed.activities.map(a => {
              // Compute finish date from start + duration if only start provided
              const start = a.startDate || ''
              const finish = a.finishDate || (
                start ? addDays(start, a.duration) : ''
              )
              return {
                id: a.id,
                wbsCode: a.wbsCode,
                name: a.name,
                duration: a.duration,
                startDate: start,
                finishDate: finish,
                isCritical: false,
              }
            }),
          },
        }
        await repo.createBaseline(baseline)
        set({ baselines: [baseline] })
      }

      // Run CPM schedule
      const result = schedule(parsed.activities, parsed.dependencies, dataDate)

      // Save all to DB
      for (const act of result.activities) {
        act.projectId = projectId
        await repo.createActivity(act)
      }
      for (const dep of parsed.dependencies) {
        await repo.createDependency(dep)
      }

      set({
        project,
        activities: result.activities,
        dependencies: parsed.dependencies,
        scheduleResult: result,
        warnings: parsed.warnings,
        activeTab: 'gantt',
        isLoading: false,
      })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  runSchedule: async (projectStart) => {
    const { activities, dependencies } = get()
    const start = projectStart || new Date().toISOString().slice(0, 10)
    const result = schedule(activities, dependencies, start)

    // Persist recomputed dates to DB
    for (const a of result.activities) {
      try { await db.activities.put(a as any) } catch {}
    }

    set({ activities: result.activities, scheduleResult: result })
  },

  loadFromDB: async (projectId) => {
    set({ isLoading: true })
    try {
      const project = await repo.getProject(projectId)
      if (!project) {
        set({ error: 'Project not found', isLoading: false })
        return
      }
      const activities = await repo.getActivities(projectId)
      const dependencies = await repo.getDependencies(projectId)
      const baselines = await repo.getBaselines(projectId)
      const result = schedule(activities, dependencies, project.dataDate)
      set({
        project,
        activities: result.activities,
        dependencies,
        baselines,
        scheduleResult: result,
        isLoading: false,
      })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },
}))
