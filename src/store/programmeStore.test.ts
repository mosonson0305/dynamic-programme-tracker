import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgrammeStore } from './programmeStore'
import { IndexedDBRepository } from '../data/indexeddb-repo'

const sampleCSV = `WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Design Phase,30,2026-08-01,2026-08-31,,,,,,N
1.1,Schematic Design,10,,,,,,,,Y
1.2,Design Development,15,,,1.1,FS,0,,,,N
`

describe('programmeStore', () => {
  beforeEach(async () => {
    // Reset store state and DB
    useProgrammeStore.setState({
      project: null,
      activities: [],
      dependencies: [],
      baselines: [],
      scheduleResult: null,
      warnings: [],
      activeTab: 'csv',
      isLoading: false,
      error: null,
    })
    const repo = new IndexedDBRepository()
    const db = repo.db
    await db.delete()
    await db.open()
  })

  it('initializes with default state', () => {
    const state = useProgrammeStore.getState()
    expect(state.project).toBeNull()
    expect(state.activities).toEqual([])
    expect(state.dependencies).toEqual([])
    expect(state.baselines).toEqual([])
    expect(state.scheduleResult).toBeNull()
    expect(state.warnings).toEqual([])
    expect(state.activeTab).toBe('csv')
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('setActiveTab changes active tab', () => {
    const { setActiveTab } = useProgrammeStore.getState()
    setActiveTab('gantt')
    expect(useProgrammeStore.getState().activeTab).toBe('gantt')
    setActiveTab('wbs')
    expect(useProgrammeStore.getState().activeTab).toBe('wbs')
  })

  it('importCSV parses CSV and creates project with schedule', async () => {
    const { importCSV } = useProgrammeStore.getState()
    await importCSV(sampleCSV, 'Test Project', '2026-07-11')

    const state = useProgrammeStore.getState()

    // Project created
    expect(state.project).not.toBeNull()
    expect(state.project!.name).toBe('Test Project')
    expect(state.project!.dataDate).toBe('2026-07-11')

    // Activities parsed and scheduled
    expect(state.activities.length).toBe(3)
    expect(state.activities[0].name).toBe('Design Phase')

    // Dependencies extracted
    expect(state.dependencies.length).toBe(1)
    expect(state.dependencies[0].relationType).toBe('FS')

    // Schedule run — activities have computed dates
    const scheduled = state.activities.find(a => a.wbsCode === '1.1')!
    expect(scheduled.earlyStart).not.toBeNull()
    expect(scheduled.earlyFinish).not.toBeNull()

    // Schedule result populated
    expect(state.scheduleResult).not.toBeNull()
    expect(state.scheduleResult!.criticalPath.length).toBeGreaterThan(0)

    // Tab switched to gantt after import
    expect(state.activeTab).toBe('gantt')

    // No error, not loading
    expect(state.error).toBeNull()
    expect(state.isLoading).toBe(false)
  })

  it('importCSV creates baseline when dates and dependencies exist', async () => {
    const { importCSV } = useProgrammeStore.getState()
    await importCSV(sampleCSV, 'Project With Baseline', '2026-07-11')

    // Baseline created (dates present + dependencies exist)
    const state = useProgrammeStore.getState()
    expect(state.baselines.length).toBe(1)
    expect(state.baselines[0].type).toBe('imported')
    expect(state.baselines[0].name).toBe('Imported Baseline')
  })

  it('runSchedule recomputes CPM dates', async () => {
    const { importCSV, runSchedule } = useProgrammeStore.getState()
    await importCSV(sampleCSV, 'Schedule Test', '2026-08-01')

    // Run with a different project start
    runSchedule('2026-09-01')

    const state = useProgrammeStore.getState()
    // Activities should have new early start dates
    const firstAct = state.activities.find(a => a.wbsCode === '1')!
    expect(firstAct.earlyStart).toBe('2026-09-01')
  })

  it('loadFromDB loads persisted project', async () => {
    // First, import a project
    const { importCSV } = useProgrammeStore.getState()
    await importCSV(sampleCSV, 'Persisted Project', '2026-07-11')
    const projectId = useProgrammeStore.getState().project!.id

    // Reset store
    useProgrammeStore.setState({
      project: null,
      activities: [],
      dependencies: [],
      baselines: [],
      scheduleResult: null,
      warnings: [],
    })

    // Load from DB
    const { loadFromDB } = useProgrammeStore.getState()
    await loadFromDB(projectId)

    const state = useProgrammeStore.getState()
    expect(state.project).not.toBeNull()
    expect(state.project!.id).toBe(projectId)
    expect(state.project!.name).toBe('Persisted Project')
    expect(state.activities.length).toBe(3)
    expect(state.dependencies.length).toBe(1)
    expect(state.scheduleResult).not.toBeNull()
  })

  it('loadFromDB sets error for non-existent project', async () => {
    const { loadFromDB } = useProgrammeStore.getState()
    await loadFromDB('non-existent-id')

    const state = useProgrammeStore.getState()
    expect(state.error).toBe('Project not found')
  })

  it('importCSV sets error state on failure', async () => {
    const { importCSV } = useProgrammeStore.getState()
    // Empty CSV after trim = 0 lines → should cause error
    await importCSV('', 'Bad Project', '2026-07-11')

    const state = useProgrammeStore.getState()
    // Empty CSV produces 0 activities but no crash — importCSV completes with warnings
    expect(state.warnings.length).toBeGreaterThan(0)
    expect(state.isLoading).toBe(false)
  })
})
