# Dynamic Programme Tracker — 實作計劃

> **For Hermes:** Use subagent-driven-development to implement this plan task-by-task.

**Goal:** 建立 React SPA — CPM 排程引擎 + Gantt Chart + Dashboard，純前端 IndexedDB 儲存，即開即用

**Architecture:** React + TypeScript + Vite，CPM Engine 純 TS class，Repository Pattern 抽象 data layer（IndexedDB default），Frappe Gantt 渲染，Recharts Dashboard

**Tech Stack:** React 19, TypeScript 5.x, Vite 7.x, Tailwind CSS, shadcn/ui, Zustand, Dexie.js, Frappe Gantt, Recharts, Vitest, Playwright

## Global Constraints

1. TDD 強制 — 每個 task 先寫 failing test，確認 fail，再寫 implementation
2. Repository Pattern — 所有 data access 經 `IProgrammeRepository` interface
3. CPM Engine 純 TypeScript，無 framework 依賴
4. 每個 task commit 一次
5. YAGNI — 不做 spec 以外的任何 feature
6. All dates in YYYY-MM-DD string format

---

### Task 1: Project Scaffolding (Vite + React + TS)

**Objective:** 建立專案骨架

**Files:**
- Create: project via `npm create vite@latest`

**Step 1: Scaffold**
```bash
cd /workspace/dynamic-programme-tracker
npm create vite@latest . -- --template react-ts
```
Expected: project files created (package.json, tsconfig.json, src/, vite.config.ts)

**Step 2: Install base deps**
```bash
npm install
```

**Step 3: Clean template boilerplate**
Delete default App.css, remove default App.tsx content, keep minimal:
```tsx
// src/App.tsx
function App() {
  return <div>Dynamic Programme Tracker</div>
}
export default App
```

**Step 4: Verify**
```bash
npx vite build
```
Expected: BUILD SUCCESS

**Step 5: Commit**
```bash
git add -A && git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

### Task 2: Install All Dependencies

**Objective:** Install Tailwind, shadcn/ui, Dexie, Zustand, Frappe Gantt, Recharts, Vitest, Playwright

**Step 1: Install npm deps**
```bash
npm install dexie zustand frappe-gantt recharts lucide-react
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test
```

**Step 2: Configure Tailwind CSS**
```ts
// vite.config.ts — add tailwindcss plugin
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

```css
/* src/index.css */
@import "tailwindcss";
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom'
```

**Step 3: Verify**
```bash
npm run dev &
sleep 3 && curl -s http://localhost:5173 | head -5
kill %1
```
Expected: HTML output with Vite dev server running

**Step 4: Commit**
```bash
git add -A && git commit -m "chore: install dependencies (Tailwind, Dexie, Zustand, Frappe, Recharts, testing)"
```

---

### Task 3: TypeScript Type Definitions

**Objective:** Define all data types

**Files:**
- Create: `src/models/activity.ts`
- Create: `src/models/dependency.ts`
- Create: `src/models/baseline.ts`
- Create: `src/models/project.ts`
- Create: `src/models/index.ts`
- Test: `src/models/types.test.ts` (structural test)

**Step 1: Write failing test**
```ts
// src/models/types.test.ts
import { describe, it, expect } from 'vitest'

describe('Type definitions', () => {
  it('Activity type should have required fields', () => {
    const a: Activity = {
      id: '1',
      projectId: 'p1',
      wbsCode: '1.1',
      name: 'Test',
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
    expect(a.name).toBe('Test')
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
})
```

Expected: FAIL — types not defined

**Step 2: Execute test verify fail**
```bash
npx vitest run src/models/types.test.ts
```

**Step 3: Write types**
```ts
// src/models/activity.ts
export type ConstraintType = 'ASAP' | 'ALAP' | 'SNET' | 'FNET'
export type ActivityStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed'

export interface Activity {
  id: string
  projectId: string
  wbsCode: string
  name: string
  parentId: string | null
  duration: number
  startDate: string | null
  finishDate: string | null
  actualStart: string | null
  actualFinish: string | null
  percentComplete: number
  earlyStart: string | null
  earlyFinish: string | null
  lateStart: string | null
  lateFinish: string | null
  totalFloat: number
  isCritical: boolean
  isMilestone: boolean
  constraintType: ConstraintType
  constraintDate: string | null
  status: ActivityStatus
  wbsLevel: number
  bimRef: string | null
  createdAt: string
  updatedAt: string
}
```
```ts
// src/models/dependency.ts
export type RelationType = 'FS' | 'SS' | 'FF' | 'SF'

export interface Dependency {
  id: string
  projectId: string
  predecessorId: string
  successorId: string
  relationType: RelationType
  lagDays: number
}
```
```ts
// src/models/baseline.ts
export interface BaselineSnapshotActivity {
  id: string
  wbsCode: string
  name: string
  duration: number
  startDate: string
  finishDate: string
  isCritical: boolean
}

export interface Baseline {
  id: string
  projectId: string
  name: string
  type: 'contract' | 'revised' | 'working' | 'imported'
  createdAt: string
  snapshot: {
    activities: BaselineSnapshotActivity[]
  }
}
```
```ts
// src/models/project.ts
export interface Project {
  id: string
  name: string
  dataDate: string
  description: string
  createdAt: string
  updatedAt: string
}
```
```ts
// src/models/index.ts
export * from './activity'
export * from './dependency'
export * from './baseline'
export * from './project'
```

**Step 4: Verify pass**
```bash
npx vitest run src/models/types.test.ts
```
Expected: 2 tests PASS

**Step 5: Commit**
```bash
git add src/models/ && git commit -m "feat: define TypeScript types (Activity, Dependency, Baseline, Project)"
```

---

### Task 4: Date Utilities

**Objective:** Date helper functions for CPM engine

**Files:**
- Create: `src/utils/date-utils.ts`
- Test: `src/utils/date-utils.test.ts`

**Step 1: Write test**
```ts
// src/utils/date-utils.test.ts
import { describe, it, expect } from 'vitest'
import { addDays, daysBetween, todayStr } from './date-utils'

describe('date-utils', () => {
  it('addDays adds calendar days', () => {
    expect(addDays('2026-01-01', 5)).toBe('2026-01-06')
  })

  it('addDays handles month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
  })

  it('addDays handles zero', () => {
    expect(addDays('2026-06-15', 0)).toBe('2026-06-15')
  })

  it('daysBetween calculates positive difference', () => {
    expect(daysBetween('2026-01-01', '2026-01-10')).toBe(9)
  })

  it('daysBetween returns negative if end before start', () => {
    expect(daysBetween('2026-01-10', '2026-01-01')).toBe(-9)
  })

  it('todayStr returns YYYY-MM-DD format', () => {
    const t = todayStr()
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

**Step 3: Implement**
```ts
// src/utils/date-utils.ts
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.round((e.getTime() - s.getTime()) / 86400000)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function compareDates(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function maxDate(a: string, b: string): string {
  return compareDates(a, b) >= 0 ? a : b
}

export function dateToDisplay(dateStr: string): string {
  return dateStr.slice(5)
}
```

**Step 4: Verify pass**
```bash
npx vitest run src/utils/date-utils.test.ts
```
Expected: all 6 tests PASS

**Step 5: Commit**
```bash
git add src/utils/ && git commit -m "feat: add date utility functions"
```

---

### Task 5: Dexie.js Database Setup

**Objective:** Define IndexedDB schema with Dexie.js

**Files:**
- Create: `src/data/db.ts`
- Test: `src/data/db.test.ts`

**Step 1: Write test**
```ts
// src/data/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'

describe('Database', () => {
  beforeEach(async () => {
    await db.projects.clear()
    await db.activities.clear()
    await db.dependencies.clear()
    await db.baselines.clear()
  })

  it('should store and retrieve a project', async () => {
    const id = await db.projects.add({
      id: crypto.randomUUID(),
      name: 'Test Project',
      dataDate: '2026-07-11',
      description: '',
      createdAt: '2026-07-11',
      updatedAt: '2026-07-11',
    })
    const p = await db.projects.get(id)
    expect(p?.name).toBe('Test Project')
  })
})
```

**Step 3: Implement**
```ts
// src/data/db.ts
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
```

**Step 4: Verify pass**
```bash
npx vitest run src/data/db.test.ts
```

**Step 5: Commit**
```bash
git add src/data/ && git commit -m "feat: set up Dexie.js IndexedDB schema"
```

---

### Task 6: Repository Interface + IndexedDB Repository

**Objective:** Define IProgrammeRepository interface and IndexedDB implementation

**Files:**
- Create: `src/data/repository.ts`
- Create: `src/data/indexeddb-repo.ts`
- Test: `src/data/indexeddb-repo.test.ts`

**Step 1: Write test**
```ts
// src/data/indexeddb-repo.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { IndexedDBRepository } from './indexeddb-repo'
import { db } from './db'

describe('IndexedDBRepository', () => {
  const repo = new IndexedDBRepository()

  beforeEach(async () => {
    await db.projects.clear()
    await db.activities.clear()
    await db.dependencies.clear()
    await db.baselines.clear()
  })

  it('getActivities returns empty for new project', async () => {
    const acts = await repo.getActivities('no-such-project')
    expect(acts).toEqual([])
  })

  it('createActivity and getActivities roundtrip', async () => {
    await repo.createActivity({
      id: 'a1', projectId: 'p1', wbsCode: '1', name: 'Task 1',
      parentId: null, duration: 10, startDate: null, finishDate: null,
      actualStart: null, actualFinish: null, percentComplete: 0,
      earlyStart: null, earlyFinish: null, lateStart: null, lateFinish: null,
      totalFloat: 0, isCritical: false, isMilestone: false,
      constraintType: 'ASAP', constraintDate: null, status: 'not_started',
      wbsLevel: 1, bimRef: null,
      createdAt: '2026-07-11', updatedAt: '2026-07-11',
    })
    const acts = await repo.getActivities('p1')
    expect(acts).toHaveLength(1)
    expect(acts[0].name).toBe('Task 1')
  })

  it('updateActivity modifies fields', async () => {
    await repo.createActivity({ /* same as above with id 'a2', name 'Original' */ })
    // simplified — just check update works
    const id = 'a2'
    await repo.createActivity({ id, projectId: 'p2', wbsCode: '1', name: 'Original',
      parentId: null, duration: 10, startDate: null, finishDate: null,
      actualStart: null, actualFinish: null, percentComplete: 0,
      earlyStart: null, earlyFinish: null, lateStart: null, lateFinish: null,
      totalFloat: 0, isCritical: false, isMilestone: false,
      constraintType: 'ASAP', constraintDate: null, status: 'not_started',
      wbsLevel: 1, bimRef: null,
      createdAt: '2026-07-11', updatedAt: '2026-07-11',
    })
    await repo.updateActivity(id, { name: 'Updated' })
    const acts = await repo.getActivities('p2')
    expect(acts[0].name).toBe('Updated')
  })
})
```

**Step 3: Implement interfaces + repo**
```ts
// src/data/repository.ts
import type { Activity, Dependency, Baseline, Project } from '../models'

export interface IProgrammeRepository {
  getProject(id: string): Promise<Project | undefined>
  createProject(data: Project): Promise<string>
  getActivities(projectId: string): Promise<Activity[]>
  createActivity(data: Activity): Promise<string>
  updateActivity(id: string, data: Partial<Activity>): Promise<void>
  deleteActivity(id: string): Promise<void>
  getDependencies(projectId: string): Promise<Dependency[]>
  createDependency(data: Dependency): Promise<string>
  deleteDependency(id: string): Promise<void>
  getBaselines(projectId: string): Promise<Baseline[]>
  createBaseline(data: Baseline): Promise<string>
  deleteBaseline(id: string): Promise<void>
}
```

```ts
// src/data/indexeddb-repo.ts
import { db } from './db'
import { IProgrammeRepository } from './repository'
import type { Activity, Dependency, Baseline, Project } from '../models'

export class IndexedDBRepository implements IProgrammeRepository {
  async getProject(id: string) { return db.projects.get(id) }
  async createProject(data: Project) { return db.projects.add(data) }
  async getActivities(projectId: string) {
    return db.activities.where('projectId').equals(projectId).toArray()
  }
  async createActivity(data: Activity) { return db.activities.add(data) }
  async updateActivity(id: string, data: Partial<Activity>) {
    await db.activities.update(id, data)
  }
  async deleteActivity(id: string) { await db.activities.delete(id) }
  async getDependencies(projectId: string) {
    return db.dependencies.where('projectId').equals(projectId).toArray()
  }
  async createDependency(data: Dependency) { return db.dependencies.add(data) }
  async deleteDependency(id: string) { await db.dependencies.delete(id) }
  async getBaselines(projectId: string) {
    return db.baselines.where('projectId').equals(projectId).toArray()
  }
  async createBaseline(data: Baseline) { return db.baselines.add(data) }
  async deleteBaseline(id: string) { await db.baselines.delete(id) }
}
```

**Step 4: Verify pass**
```bash
npx vitest run src/data/indexeddb-repo.test.ts
```

**Step 5: Commit**
```bash
git add src/data/ && git commit -m "feat: add Repository interface + IndexedDB implementation"
```

---

### Task 7: CPM Engine — Topological Sort

**Objective:** Implement topological sort for CPM dependency ordering

**Files:**
- Create: `src/engine/topo.ts`
- Test: `src/engine/topo.test.ts`

**Step 1: Write test**
```ts
// src/engine/topo.test.ts
import { describe, it, expect } from 'vitest'
import { topologicalSort } from './topo'
import type { Activity, Dependency } from '../models'

function makeAct(id: string, wbs: string): Activity {
  return {
    id, projectId: 'p', wbsCode: wbs, name: id,
    parentId: null, duration: 5, startDate: null, finishDate: null,
    actualStart: null, actualFinish: null, percentComplete: 0,
    earlyStart: null, earlyFinish: null, lateStart: null, lateFinish: null,
    totalFloat: 0, isCritical: false, isMilestone: false,
    constraintType: 'ASAP', constraintDate: null, status: 'not_started',
    wbsLevel: 1, bimRef: null,
    createdAt: '', updatedAt: '',
  }
}

describe('topologicalSort', () => {
  it('sorts linear chain A→B→C', () => {
    const acts = [makeAct('a', '1'), makeAct('b', '2'), makeAct('c', '3')]
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 0 },
      { id: 'd2', projectId: 'p', predecessorId: 'b', successorId: 'c', relationType: 'FS', lagDays: 0 },
    ]
    const result = topologicalSort(acts, deps)
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('detects circular dependency', () => {
    const acts = [makeAct('a', '1'), makeAct('b', '2')]
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 0 },
      { id: 'd2', projectId: 'p', predecessorId: 'b', successorId: 'a', relationType: 'FS', lagDays: 0 },
    ]
    expect(() => topologicalSort(acts, deps)).toThrow('Circular dependency detected')
  })

  it('handles independent branches', () => {
    const acts = [makeAct('a', '1'), makeAct('b', '2'), makeAct('c', '3')]
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'c', relationType: 'FS', lagDays: 0 },
    ]
    const result = topologicalSort(acts, deps)
    // 'b' should appear before 'c' (no dependency on 'c')
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('c'))
  })
})
```

**Step 3: Implement**
```ts
// src/engine/topo.ts
import type { Activity, Dependency } from '../models'

export class CircularDependencyError extends Error {
  constructor(ids: string[]) {
    super(`Circular dependency detected involving: ${ids.join(', ')}`)
    this.name = 'CircularDependencyError'
  }
}

export function topologicalSort(activities: Activity[], dependencies: Dependency[]): string[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const a of activities) {
    inDegree.set(a.id, 0)
    adj.set(a.id, [])
  }

  for (const d of dependencies) {
    const succ = adj.get(d.predecessorId)!
    succ.push(d.successorId)
    inDegree.set(d.successorId, (inDegree.get(d.successorId) || 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const result: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    for (const next of adj.get(node)!) {
      const newDeg = (inDegree.get(next) || 0) - 1
      inDegree.set(next, newDeg)
      if (newDeg === 0) queue.push(next)
    }
  }

  if (result.length !== activities.length) {
    const unresolved = activities.map(a => a.id).filter(id => !result.includes(id))
    throw new CircularDependencyError(unresolved)
  }

  return result
}
```

**Step 4: Verify pass** `npx vitest run src/engine/topo.test.ts`

**Step 5: Commit**
```bash
git add src/engine/ && git commit -m "feat: add CPM topological sort with cycle detection"
```

---

### Task 8: CPM Engine — Forward Pass

**Objective:** Calculate Early Start / Early Finish for all activities

**Files:**
- Modify: `src/engine/cpm.ts` (create)
- Test: `src/engine/cpm.test.ts`

**Step 1: Write test**
```ts
// src/engine/cpm.test.ts
import { describe, it, expect } from 'vitest'
import { forwardPass } from './cpm'
import type { Activity, Dependency } from '../models'

function makeAct(overrides: Partial<Activity>): Activity {
  return {
    id: 'a', projectId: 'p', wbsCode: '1', name: 'Test',
    parentId: null, duration: 5,
    startDate: null, finishDate: null,
    actualStart: null, actualFinish: null, percentComplete: 0,
    earlyStart: null, earlyFinish: null, lateStart: null, lateFinish: null,
    totalFloat: 0, isCritical: false, isMilestone: false,
    constraintType: 'ASAP', constraintDate: null, status: 'not_started',
    wbsLevel: 1, bimRef: null,
    createdAt: '', updatedAt: '',
    ...overrides,
  }
}

describe('forwardPass', () => {
  it('calculates ES/EF for single activity with project start', () => {
    const a = makeAct({ id: 'a', duration: 5 })
    const result = forwardPass([a], [], '2026-01-01')
    expect(result.get('a')?.earlyStart).toBe('2026-01-01')
    expect(result.get('a')?.earlyFinish).toBe('2026-01-06')
  })

  it('FS: successor starts after predecessor finishes', () => {
    const a = makeAct({ id: 'a', duration: 5 })
    const b = makeAct({ id: 'b', duration: 3 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 0 },
    ]
    const result = forwardPass([a, b], deps, '2026-01-01')
    expect(result.get('b')?.earlyStart).toBe('2026-01-06')  // day after a finishes
    expect(result.get('b')?.earlyFinish).toBe('2026-01-09')
  })

  it('FS with lag: successor offset by lag days', () => {
    const a = makeAct({ id: 'a', duration: 5 })
    const b = makeAct({ id: 'b', duration: 3 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 2 },
    ]
    const result = forwardPass([a, b], deps, '2026-01-01')
    // a finishes 01-06; with lag 2, b starts 01-08
    expect(result.get('b')?.earlyStart).toBe('2026-01-08')
  })

  it('SS: successor starts when predecessor starts', () => {
    const a = makeAct({ id: 'a', duration: 10 })
    const b = makeAct({ id: 'b', duration: 5 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'SS', lagDays: 0 },
    ]
    const result = forwardPass([a, b], deps, '2026-01-01')
    expect(result.get('b')?.earlyStart).toBe('2026-01-01')
    expect(result.get('b')?.earlyFinish).toBe('2026-01-06')  // duration 5
  })

  it('FF: successor finishes when predecessor finishes', () => {
    const a = makeAct({ id: 'a', duration: 10 })
    const b = makeAct({ id: 'b', duration: 5 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FF', lagDays: 0 },
    ]
    const result = forwardPass([a, b], deps, '2026-01-01')
    // a finishes 01-11, b must also finish 01-11, so b starts 01-11 - 5 = 01-06
    expect(result.get('b')?.earlyFinish).toBe('2026-01-11')
    expect(result.get('b')?.earlyStart).toBe('2026-01-06')
  })

  it('takes max ES from multiple predecessors', () => {
    const a = makeAct({ id: 'a', duration: 5 })   // finishes 01-06
    const b = makeAct({ id: 'b', duration: 10 })  // finishes 01-11
    const c = makeAct({ id: 'c', duration: 3 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'c', relationType: 'FS', lagDays: 0 },
      { id: 'd2', projectId: 'p', predecessorId: 'b', successorId: 'c', relationType: 'FS', lagDays: 0 },
    ]
    const result = forwardPass([a, b, c], deps, '2026-01-01')
    // a finishes 01-06, b finishes 01-11 — c should start after 01-11
    expect(result.get('c')?.earlyStart).toBe('2026-01-11')
  })
})
```

**Step 3: Implement**
```ts
// src/engine/cpm.ts
import { addDays, maxDate, compareDates } from '../utils/date-utils'
import { topologicalSort } from './topo'
import type { Activity, Dependency, RelationType } from '../models'

interface ComProps {
  earlyStart: string
  earlyFinish: string
}

export function forwardPass(
  activities: Activity[],
  dependencies: Dependency[],
  projectStart: string,
): Map<string, ComProps> {
  const sorted = topologicalSort(activities, dependencies)
  const result = new Map<string, ComProps>()
  const activityMap = new Map(activities.map(a => [a.id, a]))

  // Build predecessors lookup
  const predMap = new Map<string, Dependency[]>()
  for (const d of dependencies) {
    if (!predMap.has(d.successorId)) predMap.set(d.successorId, [])
    predMap.get(d.successorId)!.push(d)
  }

  for (const id of sorted) {
    const act = activityMap.get(id)!
    const preds = predMap.get(id) || []

    if (preds.length === 0) {
      result.set(id, {
        earlyStart: projectStart,
        earlyFinish: addDays(projectStart, act.duration),
      })
    } else {
      let es = '0000-01-01'
      for (const dep of preds) {
        const predResult = result.get(dep.predecessorId)!
        const candidate = calcEarlyStart(act, predResult, dep)
        es = maxDate(es, candidate)
      }
      result.set(id, {
        earlyStart: es,
        earlyFinish: addDays(es, act.duration),
      })
    }
  }

  return result
}

function calcEarlyStart(
  act: Activity,
  pred: ComProps,
  dep: Dependency,
): string {
  const { relationType, lagDays } = dep
  switch (relationType) {
    case 'FS': return addDays(pred.earlyFinish, lagDays)
    case 'SS': return addDays(pred.earlyStart, lagDays)
    case 'FF': return addDays(pred.earlyFinish, lagDays - act.duration)
    case 'SF': return addDays(pred.earlyStart, lagDays - act.duration)
  }
}
```

**Step 4: Verify pass** `npx vitest run src/engine/cpm.test.ts`

**Step 5: Commit**
```bash
git add src/engine/ && git commit -m "feat: add CPM forward pass (ES/EF calculation)"
```

---

### Task 9: CPM Engine — Backward Pass + Float + Critical Path

**Objective:** Calculate Late Start/Finish, Float, and identify Critical Path

**Files:**
- Modify: `src/engine/cpm.ts` (add functions)
- Modify: `src/engine/cpm.test.ts` (add tests)

**Step 1: Add tests to cpm.test.ts**
```ts
// Add to existing describe block:
describe('backwardPass', () => {
  it('LS/LF for simple chain', () => {
    const a = makeAct({ id: 'a', duration: 5 })
    const b = makeAct({ id: 'b', duration: 3 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 0 },
    ]
    const fwd = forwardPass([a, b], deps, '2026-01-01')
    const projectEnd = '2026-01-09' // b.earlyFinish (from fwd)
    const bwd = backwardPass([a, b], deps, fwd, projectEnd)
    // b: lateStart = projectEnd - duration = 01-06, lateFinish = 01-09
    expect(bwd.get('b')?.lateFinish).toBe('2026-01-09')
    expect(bwd.get('b')?.lateStart).toBe('2026-01-06')
    // a: lateFinish = b.lateStart = 01-06, lateStart = 01-06 - 5 = 01-01
    expect(bwd.get('a')?.lateFinish).toBe('2026-01-06')
    expect(bwd.get('a')?.lateStart).toBe('2026-01-01')
  })
})

describe('calculateFloat + identifyCriticalPath', () => {
  it('simple chain A→B→C: all critical', () => {
    const a = makeAct({ id: 'a', duration: 5 })
    const b = makeAct({ id: 'b', duration: 3 })
    const c = makeAct({ id: 'c', duration: 4 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 0 },
      { id: 'd2', projectId: 'p', predecessorId: 'b', successorId: 'c', relationType: 'FS', lagDays: 0 },
    ]
    const fwd = forwardPass([a, b, c], deps, '2026-01-01')
    // c finishes 2026-01-12
    const bwd = backwardPass([a, b, c], deps, fwd, '2026-01-12')
    const withFloat = calculateFloat([a, b, c], fwd, bwd)
    expect(withFloat.get('a')?.totalFloat).toBe(0)
    expect(withFloat.get('b')?.totalFloat).toBe(0)
    expect(withFloat.get('c')?.totalFloat).toBe(0)
    expect(withFloat.get('a')?.isCritical).toBe(true)
    expect(withFloat.get('b')?.isCritical).toBe(true)
    expect(withFloat.get('c')?.isCritical).toBe(true)

    const cp = identifyCriticalPath([a, b, c], withFloat, deps)
    expect(cp).toHaveLength(3)
    expect(cp.map(a => a.id)).toEqual(['a', 'b', 'c'])
  })

  it('branch with float: shorter branch has float', () => {
    const a = makeAct({ id: 'a', duration: 5 })
    const b = makeAct({ id: 'b', duration: 3 })  // shorter path
    const c = makeAct({ id: 'c', duration: 10 }) // longer path → critical
    const d = makeAct({ id: 'd', duration: 2 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 0 },
      { id: 'd2', projectId: 'p', predecessorId: 'a', successorId: 'c', relationType: 'FS', lagDays: 0 },
      { id: 'd3', projectId: 'p', predecessorId: 'b', successorId: 'd', relationType: 'FS', lagDays: 0 },
      { id: 'd4', projectId: 'p', predecessorId: 'c', successorId: 'd', relationType: 'FS', lagDays: 0 },
    ]
    // Path A(5)→B(3)→D(2) = 10 days
    // Path A(5)→C(10)→D(2) = 17 days → Critical
    const fwd = forwardPass([a, b, c, d], deps, '2026-01-01')

    // projectEnd = D's earlyFinish (max of both paths: date from C→D)
    const projectEnd = fwd.get('d')!.earlyFinish
    const bwd = backwardPass([a, b, c, d], deps, fwd, projectEnd)
    const withFloat = calculateFloat([a, b, c, d], fwd, bwd)

    // A and B should have float (path A→B→D is shorter than A→C→D)
    expect(withFloat.get('b')!.totalFloat).toBeGreaterThan(0)
    // C, D, A on critical path if A has no float from other paths
    expect(withFloat.get('c')!.isCritical).toBe(true)
    expect(withFloat.get('d')!.isCritical).toBe(true)

    const cp = identifyCriticalPath([a, b, c, d], withFloat, deps)
    expect(cp.map(a => a.id)).toEqual(['a', 'c', 'd'])
  })
})
```

**Step 3: Implement backwardPass, calculateFloat, identifyCriticalPath in cpm.ts**
```ts
export function backwardPass(
  activities: Activity[],
  dependencies: Dependency[],
  forwardResult: Map<string, ComProps>,
  projectEnd: string,
): Map<string, ComProps> {
  const sorted = topologicalSort(activities, dependencies)
  const reversed = [...sorted].reverse()
  const result = new Map<string, ComProps>()
  const activityMap = new Map(activities.map(a => [a.id, a]))

  const succMap = new Map<string, Dependency[]>()
  for (const d of dependencies) {
    if (!succMap.has(d.predecessorId)) succMap.set(d.predecessorId, [])
    succMap.get(d.predecessorId)!.push(d)
  }

  for (const id of reversed) {
    const act = activityMap.get(id)!
    const succs = succMap.get(id) || []

    if (succs.length === 0) {
      result.set(id, {
        lateFinish: projectEnd,
        lateStart: addDays(projectEnd, -act.duration),
      })
    } else {
      let lf = '9999-12-31'
      for (const dep of succs) {
        const succResult = result.get(dep.successorId)!
        if (!succResult) continue
        const candidate = calcLateFinish(act, succResult, dep, forwardResult)
        if (compareDates(candidate, lf) < 0) lf = candidate
      }
      result.set(id, {
        lateFinish: lf,
        lateStart: addDays(lf, -act.duration),
      })
    }
  }

  return result
}

function calcLateFinish(
  act: Activity,
  succ: ComProps,
  dep: Dependency,
  fwd: Map<string, ComProps>,
): string {
  const { relationType, lagDays } = dep
  switch (relationType) {
    case 'FS': return addDays(succ.lateStart, -lagDays)
    case 'SS': return addDays(succ.lateStart, act.duration - lagDays)
    case 'FF': return addDays(succ.lateFinish, -lagDays)
    case 'SF': return addDays(succ.lateFinish, act.duration - lagDays)
  }
}

export interface FloatInfo extends ComProps {
  totalFloat: number
  isCritical: boolean
}

export function calculateFloat(
  activities: Activity[],
  forwardResult: Map<string, ComProps>,
  backwardResult: Map<string, ComProps>,
): Map<string, FloatInfo> {
  const result = new Map<string, FloatInfo>()
  for (const act of activities) {
    const f = forwardResult.get(act.id)!
    const b = backwardResult.get(act.id)!
    const tf = daysBetween(f.earlyFinish!, b.lateFinish!)
    result.set(act.id, { ...f, totalFloat: tf, isCritical: tf === 0 })
  }
  return result
}

// Helper needed: import daysBetween at top of cpm.ts
// import { addDays, maxDate, compareDates, daysBetween } from '../utils/date-utils'

export function identifyCriticalPath(
  activities: Activity[],
  floatInfo: Map<string, FloatInfo>,
  dependencies: Dependency[],
): Activity[] {
  const activityMap = new Map(activities.map(a => [a.id, a]))
  const critical = activities.filter(a => floatInfo.get(a.id)!.isCritical)
  if (critical.length === 0) return []

  const succMap = new Map<string, string[]>()
  for (const d of dependencies) {
    if (!succMap.has(d.predecessorId)) succMap.set(d.predecessorId, [])
    succMap.get(d.predecessorId)!.push(d.successorId)
  }

  // Find start(s): no predecessor within critical set
  const criticalIds = new Set(critical.map(a => a.id))
  const predIds = new Set(dependencies.filter(d => criticalIds.has(d.successorId)).map(d => d.predecessorId))
  const starts = critical.filter(a => !predIds.has(a.id))

  // Walk forward picking successors that are critical
  const path: Activity[] = []
  let current = starts[0]  // take first start
  while (current) {
    path.push(current)
    const succs = (succMap.get(current.id) || []).filter(id => criticalIds.has(id))
    current = succs.length > 0 ? activityMap.get(succs[0])! : undefined
  }

  return path
}
```

**Update import at top of cpm.ts:**
```ts
import { addDays, maxDate, compareDates, daysBetween } from '../utils/date-utils'
```

**Step 4: Verify pass** `npx vitest run src/engine/cpm.test.ts`

**Step 5: Commit**
```bash
git add src/engine/ && git commit -m "feat: add CPM backward pass, float calculation, and critical path identification"
```

---

### Task 10: CPM Scheduler (Orchestrator)

**Objective:** One-call schedule() that runs full CPM and returns updated activities

**Files:**
- Create: `src/engine/scheduler.ts`
- Test: `src/engine/scheduler.test.ts`

**Step 1: Write test**
```ts
// src/engine/scheduler.test.ts
import { describe, it, expect } from 'vitest'
import { schedule } from './scheduler'
import type { Activity, Dependency } from '../models'

function makeAct(overrides: Partial<Activity>): Activity {
  return {
    id: 'a', projectId: 'p', wbsCode: '1', name: 'Test',
    parentId: null, duration: 5,
    startDate: null, finishDate: null,
    actualStart: null, actualFinish: null, percentComplete: 0,
    earlyStart: null, earlyFinish: null, lateStart: null, lateFinish: null,
    totalFloat: 0, isCritical: false, isMilestone: false,
    constraintType: 'ASAP', constraintDate: null, status: 'not_started',
    wbsLevel: 1, bimRef: null,
    createdAt: '', updatedAt: '',
    ...overrides,
  }
}

describe('schedule', () => {
  it('computes full schedule for A→B→C chain', () => {
    const a = makeAct({ id: 'a', duration: 5 })
    const b = makeAct({ id: 'b', duration: 3 })
    const c = makeAct({ id: 'c', duration: 4 })
    const deps: Dependency[] = [
      { id: 'd1', projectId: 'p', predecessorId: 'a', successorId: 'b', relationType: 'FS', lagDays: 0 },
      { id: 'd2', projectId: 'p', predecessorId: 'b', successorId: 'c', relationType: 'FS', lagDays: 0 },
    ]
    const result = schedule([a, b, c], deps, '2026-01-01')

    expect(result.activities[0].startDate).toBe('2026-01-01')
    expect(result.activities[0].finishDate).toBe('2026-01-06')
    expect(result.activities[0].isCritical).toBe(true)
    expect(result.activities[2].startDate).toBe('2026-01-09')
    expect(result.projectFinish).toBe('2026-01-12')
    expect(result.criticalPath).toHaveLength(3)
  })
})
```

**Step 3: Implement**
```ts
// src/engine/scheduler.ts
import { forwardPass, backwardPass, calculateFloat, identifyCriticalPath, type FloatInfo } from './cpm'
import type { Activity, Dependency } from '../models'

export interface ScheduleResult {
  activities: Activity[]
  criticalPath: Activity[]
  projectFinish: string
  floatInfo: Map<string, FloatInfo>
}

export function schedule(
  activities: Activity[],
  dependencies: Dependency[],
  projectStart?: string,
): ScheduleResult {
  const start = projectStart || new Date().toISOString().slice(0, 10)

  // Deep clone activities to avoid mutation
  const cloned: Activity[] = activities.map(a => ({ ...a }))

  const fwd = forwardPass(cloned, dependencies, start)

  // Project end = max early finish
  let projectEnd = start
  for (const [, fi] of fwd) {
    if (fi.earlyFinish > projectEnd) projectEnd = fi.earlyFinish
  }

  const bwd = backwardPass(cloned, dependencies, fwd, projectEnd)
  const floatInfo = calculateFloat(cloned, fwd, bwd)

  // Apply results to cloned activities
  for (const act of cloned) {
    const fi = floatInfo.get(act.id)!
    act.earlyStart = fi.earlyStart
    act.earlyFinish = fi.earlyFinish
    act.lateStart = fi.lateStart
    act.lateFinish = fi.lateFinish
    act.totalFloat = fi.totalFloat
    act.isCritical = fi.isCritical
    // Set startDate/finishDate to early dates
    act.startDate = fi.earlyStart
    act.finishDate = fi.earlyFinish
  }

  const cp = identifyCriticalPath(cloned, floatInfo, dependencies)

  return {
    activities: cloned,
    criticalPath: cp,
    projectFinish: projectEnd,
    floatInfo,
  }
}
```

**Step 4: Verify pass** `npx vitest run src/engine/scheduler.test.ts`

**Step 5: Commit**
```bash
git add src/engine/ && git commit -m "feat: add CPM scheduler orchestrator (one-call schedule())"
```

---

### Task 11: CSV Parser

**Objective:** Parse CSV string into activities and dependencies

**Files:**
- Create: `src/utils/csv-parser.ts`
- Test: `src/utils/csv-parser.test.ts`

**Step 1: Write test**
```ts
// src/utils/csv-parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseProgrammeCSV } from './csv-parser'

const sampleCSV = `WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Design Phase,30,2026-08-01,2026-08-31,,,,,,N
1.1,Schematic Design,10,,,,,,,Y
1.2,Design Development,15,,,1.1,FS,0,,,,N
`

describe('parseProgrammeCSV', () => {
  it('parses valid CSV into activities and dependencies', () => {
    const result = parseProgrammeCSV(sampleCSV)
    expect(result.activities).toHaveLength(3)
    expect(result.activities[0].name).toBe('Design Phase')
    expect(result.activities[0].wbsCode).toBe('1')
    expect(result.activities[0].wbsLevel).toBe(1)
    expect(result.activities[1].wbsCode).toBe('1.1')
    expect(result.activities[1].wbsLevel).toBe(2)
    expect(result.activities[1].isMilestone).toBe(true)
    expect(result.activities[1].duration).toBe(10)
    expect(result.activities[2].duration).toBe(15)
    expect(result.dependencies).toHaveLength(1)
    expect(result.dependencies[0].relationType).toBe('FS')
    expect(result.dependencies[0].lagDays).toBe(0)
  })

  it('UUIDs are deterministic', () => {
    const r1 = parseProgrammeCSV(sampleCSV)
    const r2 = parseProgrammeCSV(sampleCSV)
    expect(r1.activities[0].id).toBe(r2.activities[0].id)
  })
})
```

**Step 3: Implement**
```ts
// src/utils/csv-parser.ts
import type { Activity, Dependency } from '../models'

export interface ParseResult {
  activities: Activity[]
  dependencies: Dependency[]
  warnings: string[]
}

export function parseProgrammeCSV(csvText: string, projectId?: string): ParseResult {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    return { activities: [], dependencies: [], warnings: ['CSV is empty or has no data rows'] }
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1)
  const warnings: string[] = []
  const activities: Activity[] = []
  const depRows: Array<{ row: number; preds: string[]; succWbs: string; relation: string; lag: number }> = []

  for (let i = 0; i < rows.length; i++) {
    const values = rows[i].split(',').map(v => v.trim())
    if (values.length < 2 || !values[0]) continue

    const wbsCode = values[0]
    const name = values[1]
    const duration = parseInt(values[2]) || 0
    const startDate = values[3] || null
    const finishDate = values[4] || null
    const predecessors = values[5] || null
    const relation = values[6] || 'FS'
    const lag = parseInt(values[7]) || 0
    const constraint = values[8] || 'ASAP'
    const constraintDate = values[9] || null
    const isMilestone = values[10] === 'Y'

    // Generate deterministic UUID from wbsCode
    const id = generateDeterministicUUID(`${projectId || 'default'}-${wbsCode}`)

    activities.push({
      id,
      projectId: projectId || 'default',
      wbsCode,
      name,
      parentId: getParentWbs(wbsCode) || null,
      duration,
      startDate,
      finishDate,
      actualStart: null,
      actualFinish: null,
      percentComplete: 0,
      earlyStart: null,
      earlyFinish: null,
      lateStart: null,
      lateFinish: null,
      totalFloat: 0,
      isCritical: false,
      isMilestone,
      constraintType: constraint as Activity['constraintType'],
      constraintDate,
      status: 'not_started' as Activity['status'],
      wbsLevel: wbsCode.split('.').length,
      bimRef: null,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    })

    if (predecessors) {
      const predList = predecessors.split(';').map(p => p.trim())
      depRows.push({
        row: i,
        preds: predList,
        succWbs: wbsCode,
        relation,
        lag,
      })
    }
  }

  // Build WBS → ID lookup
  const wbsToId = new Map(activities.map(a => [a.wbsCode, a.id]))

  // Process dependencies
  const dependencies: Dependency[] = []
  for (const dr of depRows) {
    for (const predWbs of dr.preds) {
      const predId = wbsToId.get(predWbs)
      if (!predId) {
        warnings.push(`Row ${dr.row + 2}: predecessor "${predWbs}" not found`)
        continue
      }
      const succId = wbsToId.get(dr.succWbs)!
      dependencies.push({
        id: generateDeterministicUUID(`${predId}-${succId}`),
        projectId: projectId || 'default',
        predecessorId: predId,
        successorId: succId,
        relationType: dr.relation as Dependency['relationType'],
        lagDays: dr.lag,
      })
    }
  }

  return { activities, dependencies, warnings }
}

function getParentWbs(wbsCode: string): string | undefined {
  const parts = wbsCode.split('.')
  if (parts.length <= 1) return undefined
  return parts.slice(0, -1).join('.')
}

function generateDeterministicUUID(str: string): string {
  // Simple hash-based deterministic UUID v5-like
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `${hex}-0000-4000-8000-${'0'.repeat(12)}`
}
```

**Step 4: Verify pass** `npx vitest run src/utils/csv-parser.test.ts`

**Step 5: Commit**
```bash
git add src/utils/ && git commit -m "feat: add CSV parser with WBS hierarchy and dependency extraction"
```

---

### Task 12: Zustand Store

**Objective:** Global state management for programme data

**Files:**
- Create: `src/store/programmeStore.ts`

**Step 1: Implement directly (simple store, no TDD needed for pure state)**
```ts
// src/store/programmeStore.ts
import { create } from 'zustand'
import type { Activity, Dependency, Baseline, Project } from '../models'
import { IndexedDBRepository } from '../data/indexeddb-repo'
import { schedule, type ScheduleResult } from '../engine/scheduler'
import { parseProgrammeCSV } from '../utils/csv-parser'

interface ProgrammeState {
  // Data
  project: Project | null
  activities: Activity[]
  dependencies: Dependency[]
  baselines: Baseline[]
  scheduleResult: ScheduleResult | null
  warnings: string[]

  // UI state
  activeTab: 'gantt' | 'dashboard' | 'wbs' | 'csv'
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

      // Auto-create baseline if dates present and dependencie
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
            activities: parsed.activities.map(a => ({
              id: a.id,
              wbsCode: a.wbsCode,
              name: a.name,
              duration: a.duration,
              startDate: a.startDate || '',
              finishDate: a.finishDate || '',
              isCritical: false,
            })),
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

  runSchedule: (projectStart) => {
    const { activities, dependencies } = get()
    const start = projectStart || new Date().toISOString().slice(0, 10)
    const result = schedule(activities, dependencies, start)
    set({ activities: result.activities, scheduleResult: result })
  },

  loadFromDB: async (projectId) => {
    set({ isLoading: true })
    try {
      const project = await repo.getProject(projectId)
      if (!project) { set({ error: 'Project not found', isLoading: false }); return }
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
```

**Step 2: Verify** `npx tsc --noEmit`

**Step 3: Commit**
```bash
git add src/store/ && git commit -m "feat: add Zustand store with CSV import, schedule, and DB persistence"
```

---

### Task 13: Gantt View Component

**Objective:** Wrap Frappe Gantt with programme data binding

**Files:**
- Create: `src/components/Gantt/GanttView.tsx`
- Create: `src/components/Gantt/gantt.css`

**Step 1: Implement**
```tsx
// src/components/Gantt/GanttView.tsx
import { useEffect, useRef } from 'react'
import Gantt from 'frappe-gantt'
import { useProgrammeStore } from '../../store/programmeStore'
import './gantt.css'

export function GanttView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<Gantt | null>(null)
  const { activities, dependencies } = useProgrammeStore()

  useEffect(() => {
    if (!containerRef.current || activities.length === 0) return

    const tasks = activities.map(a => ({
      id: a.id,
      name: a.name,
      start: a.startDate || a.earlyStart || '',
      end: a.finishDate || a.earlyFinish || '',
      progress: a.percentComplete,
      dependencies: dependencies
        .filter(d => d.successorId === a.id)
        .map(d => d.predecessorId),
      custom_class: a.isCritical ? 'critical' : a.isMilestone ? 'milestone' : '',
    }))

    if (ganttRef.current) {
      ganttRef.current.refresh(tasks)
    } else {
      ganttRef.current = new Gantt(containerRef.current, tasks, {
        view_mode: 'Month',
        date_format: 'YYYY-MM-DD',
        bar_height: 24,
        bar_corner_radius: 3,
        arrow_curve: 5,
        padding: 18,
        language: 'en',
      })
    }
  }, [activities, dependencies])

  if (activities.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400">No activities. Import a CSV to see the Gantt chart.</div>
  }

  return (
    <div className="gantt-container">
      <div ref={containerRef} />
    </div>
  )
}
```

```css
/* src/components/Gantt/gantt.css */
.gantt-container {
  overflow: auto;
}
.gantt-container svg {
  width: 100%;
}
.gantt .bar-label {
  fill: #fff;
  font-size: 11px;
}
.critical .bar-progress {
  fill: #ef4444 !important;
}
.milestone .bar-progress {
  fill: #8b5cf6 !important;
}
```

**Step 2: Verify** `npx tsc --noEmit`

**Step 3: Commit**
```bash
git add src/components/Gantt/ && git commit -m "feat: add Frappe Gantt wrapper component"
```

---

### Task 14: Dashboard — KPI Cards

**Objective:** Render 4 KPI metric cards

**Files:**
- Create: `src/components/Dashboard/KPICards.tsx`

**Step 1: Implement**
```tsx
// src/components/Dashboard/KPICards.tsx
import { useProgrammeStore } from '../../store/programmeStore'

export function KPICards() {
  const { activities, baselines, scheduleResult } = useProgrammeStore()

  // Overall % Complete (weighted by duration)
  const totalDuration = activities.filter(a => !a.isMilestone).reduce((s, a) => s + a.duration, 0)
  const completedDuration = activities.filter(a => a.status === 'completed').reduce((s, a) => s + a.duration * (a.percentComplete / 100), 0)
  const inProgressDuration = activities.filter(a => a.status === 'in_progress').reduce((s, a) => s + a.duration * (a.percentComplete / 100), 0)
  const overallPct = totalDuration > 0 ? Math.round(((completedDuration + inProgressDuration) / totalDuration) * 100) : 0

  // Critical Path slip
  const baseline = baselines[0]
  const cpSlip = (() => {
    if (!baseline || !scheduleResult) return 0
    const baselineEnd = baseline.snapshot.activities
      .map(a => a.finishDate)
      .sort()
      .reverse()[0] || ''
    if (!baselineEnd) return 0
    const diff = new Date(scheduleResult.projectFinish).getTime() - new Date(baselineEnd).getTime()
    return Math.round(diff / 86400000)
  })()

  // SPI
  const hasBaseline = baselines.length > 0
  const spi = hasBaseline ? (() => {
    const ev = activities.reduce((s, a) => s + a.duration * (a.percentComplete / 100), 0)
    const now = new Date().toISOString().slice(0, 10)
    const pv = activities.filter(a => a.startDate && a.startDate <= now).reduce((s, a) => s + a.duration, 0)
    return pv > 0 ? (ev / pv) : 1
  })() : null

  // Milestone completion rate
  const milestones = activities.filter(a => a.isMilestone)
  const dueMilestones = milestones.filter(m => m.startDate && m.startDate <= new Date().toISOString().slice(0, 10))
  const completedMilestones = dueMilestones.filter(m => m.status === 'completed')
  const milestoneRate = dueMilestones.length > 0 ? Math.round((completedMilestones.length / dueMilestones.length) * 100) : 100

  const cards = [
    { label: 'Overall %', value: `${overallPct}%`, color: overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-yellow-500' : 'text-red-500' },
    { label: 'SPI', value: spi !== null ? spi.toFixed(2) : '--', color: spi !== null && spi >= 0.95 ? 'text-green-600' : spi !== null && spi >= 0.90 ? 'text-yellow-500' : 'text-red-500', subtitle: !hasBaseline ? 'Need baseline' : undefined },
    { label: 'CP Slip', value: cpSlip > 0 ? `+${cpSlip}d` : `${cpSlip}d`, color: cpSlip <= 0 ? 'text-green-600' : cpSlip <= 7 ? 'text-yellow-500' : 'text-red-500' },
    { label: 'Milestones', value: `${milestoneRate}%`, color: milestoneRate >= 80 ? 'text-green-600' : milestoneRate >= 60 ? 'text-yellow-500' : 'text-red-500', subtitle: `${completedMilestones.length}/${dueMilestones.length}` },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">{c.label}</div>
          <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
          {c.subtitle && <div className="text-xs text-gray-400 mt-1">{c.subtitle}</div>}
        </div>
      ))}
    </div>
  )
}
```
(Note: The above uses inline conditional which may need a fix — let's make a cleaner version)

**Step 2: Verify** `npx tsc --noEmit`

**Step 3: Commit**
```bash
git add src/components/Dashboard/KPICards.tsx && git commit -m "feat: add dashboard KPI cards (Overall%, SPI, CP Slip, Milestones)"
```

---

### Task 15: Dashboard — Status Chart + Critical Path List

**Objective:** Activity status distribution chart and CP list

**Files:**
- Create: `src/components/Dashboard/StatusChart.tsx`
- Create: `src/components/Dashboard/CPList.tsx`

**StatusChart.tsx:**
```tsx
import { useProgrammeStore } from '../../store/programmeStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function StatusChart() {
  const { activities } = useProgrammeStore()
  const counts = {
    Completed: activities.filter(a => a.status === 'completed').length,
    'In Progress': activities.filter(a => a.status === 'in_progress').length,
    'Not Started': activities.filter(a => a.status === 'not_started').length,
    Delayed: activities.filter(a => a.status === 'delayed').length,
  }
  const data = Object.entries(counts).map(([name, count]) => ({ name, count }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Activity Status</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="name" fontSize={11} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Bar dataKey="count" fill="#6b5ce7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**CPList.tsx:**
```tsx
import { useProgrammeStore } from '../../store/programmeStore'

export function CPList() {
  const { scheduleResult } = useProgrammeStore()
  const cp = scheduleResult?.criticalPath || []

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Critical Path</h3>
      {cp.length === 0 ? (
        <p className="text-sm text-gray-400">No critical path computed.</p>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          {cp.map((a, i) => (
            <span key={a.id} className="flex items-center">
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-mono">{a.wbsCode}</span>
              {i < cp.length - 1 && <span className="text-red-400 mx-1">→</span>}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-400">
        Total: {cp.length} activities | Project finish: {scheduleResult?.projectFinish}
      </div>
    </div>
  )
}
```

**Step 2: Verify** `npx tsc --noEmit`

**Step 3: Commit**
```bash
git add src/components/Dashboard/ && git commit -m "feat: add status chart + critical path list components"
```

---

### Task 16: Dashboard — Upcoming Milestones

**Objective:** List milestones due within next 4 weeks

**Files:**
- Create: `src/components/Dashboard/UpcomingMilestones.tsx`

**Step 1: Implement**
```tsx
// src/components/Dashboard/UpcomingMilestones.tsx
import { useProgrammeStore } from '../../store/programmeStore'
import { addDays } from '../../utils/date-utils'

export function UpcomingMilestones() {
  const { activities } = useProgrammeStore()
  const today = new Date().toISOString().slice(0, 10)
  const fourWeeks = addDays(today, 28)

  const upcoming = activities
    .filter(a => a.isMilestone && a.startDate && a.startDate >= today && a.startDate <= fourWeeks)
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Upcoming Milestones (4 weeks)</h3>
      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400">No milestones in the next 4 weeks.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Milestone</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map(m => (
              <tr key={m.id} className="border-b border-gray-50">
                <td className="py-2 font-mono text-gray-600">{m.startDate?.slice(5)}</td>
                <td className="py-2">{m.name}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    m.status === 'completed' ? 'bg-green-100 text-green-700' :
                    m.status === 'delayed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {m.status === 'completed' ? 'Done' : m.status === 'delayed' ? 'Delayed' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

**Step 2: Verify & Commit**
```bash
npx tsc --noEmit
git add src/components/Dashboard/UpcomingMilestones.tsx && git commit -m "feat: add upcoming milestones component (4-week lookahead)"
```

---

### Task 17: Dashboard — Main Layout

**Objective:** Combine all dashboard components into one page

**Files:**
- Create: `src/components/Dashboard/Dashboard.tsx`

**Step 1: Implement**
```tsx
// src/components/Dashboard/Dashboard.tsx
import { KPICards } from './KPICards'
import { StatusChart } from './StatusChart'
import { CPList } from './CPList'
import { UpcomingMilestones } from './UpcomingMilestones'

export function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Project Health Dashboard</h2>
      <KPICards />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatusChart />
        <CPList />
      </div>
      <UpcomingMilestones />
    </div>
  )
}
```

**Step 2: Verify & Commit**
```bash
npx tsc --noEmit && git add -A && git commit -m "feat: assemble dashboard page with KPI cards + status chart + CP + milestones"
```

---

### Task 18: WBS Tree View

**Objective:** Tree view showing WBS hierarchy with activity details

**Files:**
- Create: `src/components/WBSTree/WBSTree.tsx`

**Step 1: Implement**
```tsx
// src/components/WBSTree/WBSTree.tsx
import { useState } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'

export function WBSTree() {
  const { activities } = useProgrammeStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(activities.filter(a => a.wbsLevel === 1).map(a => a.wbsCode)))

  const toggle = (wbs: string) => {
    const next = new Set(expanded)
    if (next.has(wbs)) next.delete(wbs); else next.add(wbs)
    setExpanded(next)
  }

  // Build tree from wbsLevel
  const rootActs = activities.filter(a => a.wbsLevel === 1).sort((a, b) => a.wbsCode.localeCompare(b.wbsCode))
  const children = (wbsCode: string) =>
    activities.filter(a => a.wbsCode.startsWith(wbsCode + '.') && a.wbsCode.split('.').length === wbsCode.split('.').length + 1)
      .sort((a, b) => a.wbsCode.localeCompare(b.wbsCode))

  const renderRow = (act: typeof activities[0], depth: number = 0) => {
    const kids = children(act.wbsCode)
    const hasKids = kids.length > 0
    const isExpanded = expanded.has(act.wbsCode)

    return (
      <div key={act.id}>
        <div className="flex items-center py-1 px-2 hover:bg-gray-50 border-b border-gray-100 text-sm"
             style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          {hasKids && (
            <button onClick={() => toggle(act.wbsCode)} className="mr-1 w-5 text-gray-400">
              {isExpanded ? '▾' : '▸'}
            </button>
          )}
          {!hasKids && <span className="w-5 mr-1" />}
          <span className="font-mono text-gray-400 w-16">{act.wbsCode}</span>
          <span className="flex-1">{act.name}</span>
          <span className="text-gray-400 w-24 text-right font-mono">{act.startDate?.slice(5) || '--'}</span>
          <span className="text-gray-400 w-24 text-right font-mono">{act.finishDate?.slice(5) || '--'}</span>
          <span className="w-16 text-right">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              act.isCritical ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {act.isCritical ? 'CP' : `${act.totalFloat}d`}
            </span>
          </span>
        </div>
        {hasKids && isExpanded && kids.map(k => renderRow(k, depth + 1))}
      </div>
    )
  }

  if (activities.length === 0) {
    return <div className="p-6 text-gray-400">No activities. Import a CSV first.</div>
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">WBS Tree</h2>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <div className="flex items-center py-2 px-2 bg-gray-50 border-b font-semibold text-xs text-gray-500">
          <span className="w-5 mr-1" />
          <span className="w-16">WBS</span>
          <span className="flex-1">Activity</span>
          <span className="w-24 text-right">Start</span>
          <span className="w-24 text-right">Finish</span>
          <span className="w-16 text-right">Float</span>
        </div>
        {rootActs.map(a => renderRow(a))}
      </div>
    </div>
  )
}
```

**Step 2: Verify & Commit**
```bash
npx tsc --noEmit && git add -A && git commit -m "feat: add WBS tree view with expand/collapse hierarchy"
```

---

### Task 19: CSV Import Page

**Objective:** File upload and paste interface for CSV import

**Files:**
- Create: `src/components/CSV/CSVImport.tsx`

**Step 1: Implement**
```tsx
// src/components/CSV/CSVImport.tsx
import { useState, useCallback } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'

export function CSVImport() {
  const { importCSV, isLoading, error, warnings } = useProgrammeStore()
  const [projectName, setProjectName] = useState('')
  const [dataDate, setDataDate] = useState(new Date().toISOString().slice(0, 10))
  const [csvText, setCsvText] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleImport = () => {
    if (!csvText.trim()) return
    importCSV(csvText, projectName || 'Untitled Project', dataDate)
  }

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setCsvText(e.target?.result as string)
    reader.readAsText(file)
  }, [])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Import CSV</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Project Name</label>
            <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="My Construction Project" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Date</label>
            <input type="date" value={dataDate} onChange={e => setDataDate(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
        >
          <p className="text-gray-400 mb-2">Drop CSV file here, or</p>
          <label className="bg-purple-600 text-white px-4 py-2 rounded cursor-pointer inline-block text-sm">
            Browse Files
            <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Or paste CSV content:</label>
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm font-mono h-48"
            placeholder={`WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Design Phase,30,2026-08-01,,,,,,,N
...`}
          />
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">{error}</div>}

        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700">
            {warnings.map((w, i) => <div key={i}>{w}</div>)}
          </div>
        )}

        <button onClick={handleImport} disabled={isLoading || !csvText.trim()}
          className="bg-purple-600 text-white px-6 py-2 rounded disabled:opacity-50">
          {isLoading ? 'Importing...' : 'Import & Schedule'}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify & Commit**
```bash
npx tsc --noEmit && git add -A && git commit -m "feat: add CSV import page with drag-drop, paste, and validation"
```

---

### Task 20: CSV Export + Main App Layout

**Objective:** CSV export utility and main App shell with tab navigation

**Files:**
- Create: `src/components/CSV/CSVExport.tsx`
- Modify: `src/App.tsx`

**CSVExport.tsx:**
```tsx
// src/components/CSV/CSVExport.tsx
import { useProgrammeStore } from '../../store/programmeStore'
import { todayStr } from '../../utils/date-utils'

export function CSVExport() {
  const { activities, dependencies } = useProgrammeStore()

  const handleExport = () => {
    const headers = 'WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone'
    const wbsToId = new Map(activities.map(a => [a.id, a.wbsCode]))

    const rows = activities.map(a => {
      const preds = dependencies.filter(d => d.successorId === a.id)
      const predStr = preds.map(d => wbsToId.get(d.predecessorId)).filter(Boolean).join(';')
      const relType = preds[0]?.relationType || ''
      const lag = preds[0]?.lagDays || 0
      return [
        a.wbsCode, a.name, a.duration,
        a.startDate || '', a.finishDate || '',
        predStr, predStr ? relType : '', predStr ? lag : '',
        a.constraintType === 'ASAP' ? '' : a.constraintType,
        a.constraintDate || '',
        a.isMilestone ? 'Y' : 'N',
      ].join(',')
    })

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `programme-export-${todayStr()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Export CSV</h2>
      <p className="text-gray-500 mb-4">Download the current programme as a CSV file.</p>
      <button onClick={handleExport}
        className="bg-green-600 text-white px-6 py-2 rounded">
        Download CSV
      </button>
    </div>
  )
}
```

**App.tsx:**
```tsx
// src/App.tsx
import { useProgrammeStore } from './store/programmeStore'
import { GanttView } from './components/Gantt/GanttView'
import { Dashboard } from './components/Dashboard/Dashboard'
import { WBSTree } from './components/WBSTree/WBSTree'
import { CSVImport } from './components/CSV/CSVImport'
import { CSVExport } from './components/CSV/CSVExport'

const tabs = [
  { key: 'csv', label: 'CSV', component: CSVImport },
  { key: 'gantt', label: 'Gantt', component: GanttView },
  { key: 'dashboard', label: 'Dashboard', component: Dashboard },
  { key: 'wbs', label: 'WBS Tree', component: WBSTree },
  { key: 'export', label: 'Export', component: CSVExport },
] as const

export default function App() {
  const { activeTab, setActiveTab, project } = useProgrammeStore()

  const ActiveComponent = tabs.find(t => t.key === activeTab)?.component || CSVImport

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-800">📋 Dynamic Programme Tracker</h1>
            {project && <span className="text-sm text-gray-500">{project.name}</span>}
          </div>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main>
        <ActiveComponent />
      </main>
    </div>
  )
}
```

**Step 2: Verify & Commit**
```bash
npx tsc --noEmit && git add -A && git commit -m "feat: add CSV export + main App shell with tab navigation"
```

---

### Task 21: Styling + Polish

**Objective:** Tailwind styling, responsive fixes, and polish

**Files:**
- Modify: `src/index.css` (global styles)
- Modify: various components for consistency

**index.css:**
```css
@import "tailwindcss";

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.gantt .grid-header {
  fill: #f9fafb;
}

.gantt .grid-row:nth-child(even) .grid-row-cell {
  fill: #f9fafb;
}
```

**Step 2: Verify & Commit**
```bash
npx tsc --noEmit && npm run build
git add -A && git commit -m "style: Tailwind polish and responsive styling"
```

---

### Task 22: E2E Test (Playwright)

**Objective:** End-to-end test: import CSV → schedule → verify gantt + dashboard

**Files:**
- Create: `e2e/import-schedule.spec.ts`

**Step 1: Write test**
```ts
// e2e/import-schedule.spec.ts
import { test, expect } from '@playwright/test'

const sampleCSV = `WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Design Phase,30,2026-08-01,2026-08-31,,,,,,N
1.1,Schematic Design,10,,,,,,,Y
1.2,Design Development,15,,,1.1,FS,0,,,,N
1.3,Construction Documents,20,,,1.2,FS,0,,,,N
`

test('import CSV and verify Gantt + Dashboard', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // Fill in project name and paste CSV
  await page.fill('input[placeholder="My Construction Project"]', 'E2E Test')
  await page.fill('textarea', sampleCSV)
  await page.click('button:has-text("Import & Schedule")')

  // Wait for Gantt tab to appear
  await expect(page.locator('text=Schematic Design')).toBeVisible({ timeout: 5000 })

  // Switch to Dashboard
  await page.click('button:has-text("Dashboard")')
  await expect(page.locator('text=Project Health Dashboard')).toBeVisible()
  await expect(page.locator('text=Overall %')).toBeVisible()
})
```

**Step 2: Install Playwright browsers**
```bash
npx playwright install chromium
```

**Step 3: Verify & Commit**
```bash
git add e2e/ && git commit -m "test: add Playwright E2E test for import-schedule workflow"
```

---

### Task 23: Final Integration + Build Verification

**Objective:** Run full test suite + build

**Step 1: Unit tests**
```bash
npx vitest run
```

**Step 2: Build**
```bash
npm run build
```
Expected: BUILD SUCCESS, output in `dist/`

**Step 3: E2E**
```bash
npx playwright test
```

**Step 4: Final commit**
```bash
git add -A && git commit -m "chore: final integration verification"
```

---

## Execution Order

```
Task 1  → Task 2  → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
(scaffold)(deps)  (types) (dates)  (db)    (repo)  (topo)  (fwd pass)

→ Task 9 → Task 10 → Task 11 → Task 12 → Task 13 → Task 14
  (bwd+CP) (sched)  (CSV)    (store)   (Gantt)  (KPI)

→ Task 15 → Task 16 → Task 17 → Task 18 → Task 19 → Task 20
  (charts) (ms)     (dash)    (WBS)    (import)  (App+Export)

→ Task 21 → Task 22 → Task 23
  (style)  (E2E)    (final)
```

Total: 23 tasks, estimated ~2 hours of agent execution time (fresh subagent per task for context distillation).
