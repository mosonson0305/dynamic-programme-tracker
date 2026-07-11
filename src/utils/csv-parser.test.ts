import { describe, it, expect } from 'vitest'
import { parseProgrammeCSV } from './csv-parser'

const sampleCSV = `WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Design Phase,30,2026-08-01,2026-08-31,,,,,,N
1.1,Schematic Design,10,,,,,,,,Y
1.2,Design Development,15,,,1.1,FS,0,,,,N
`

describe('parseProgrammeCSV', () => {
  it('parses valid CSV into activities and dependencies', () => {
    const result = parseProgrammeCSV(sampleCSV)

    expect(result.activities).toHaveLength(3)

    // Activity 0: Design Phase (level 1, not milestone)
    expect(result.activities[0].name).toBe('Design Phase')
    expect(result.activities[0].wbsCode).toBe('1')
    expect(result.activities[0].wbsLevel).toBe(1)
    expect(result.activities[0].isMilestone).toBe(false)
    expect(result.activities[0].duration).toBe(30)
    expect(result.activities[0].startDate).toBe('2026-08-01')
    expect(result.activities[0].finishDate).toBe('2026-08-31')
    expect(result.activities[0].parentId).toBeNull()

    // Activity 1: Schematic Design (level 2, milestone, child of 1)
    expect(result.activities[1].wbsCode).toBe('1.1')
    expect(result.activities[1].wbsLevel).toBe(2)
    expect(result.activities[1].isMilestone).toBe(true)
    expect(result.activities[1].duration).toBe(10)
    expect(result.activities[1].name).toBe('Schematic Design')

    // Activity 2: Design Development (level 2, not milestone)
    expect(result.activities[2].wbsCode).toBe('1.2')
    expect(result.activities[2].duration).toBe(15)

    // Dependencies
    expect(result.dependencies).toHaveLength(1)
    expect(result.dependencies[0].relationType).toBe('FS')
    expect(result.dependencies[0].lagDays).toBe(0)
    expect(result.dependencies[0].predecessorId).toBe(result.activities[1].id)
    expect(result.dependencies[0].successorId).toBe(result.activities[2].id)
  })

  it('UUIDs are deterministic', () => {
    const r1 = parseProgrammeCSV(sampleCSV)
    const r2 = parseProgrammeCSV(sampleCSV)
    expect(r1.activities[0].id).toBe(r2.activities[0].id)
    expect(r1.activities[1].id).toBe(r2.activities[1].id)
    expect(r1.dependencies[0].id).toBe(r2.dependencies[0].id)
  })

  it('detects WBS hierarchy via parentId', () => {
    const result = parseProgrammeCSV(sampleCSV)
    // Activity 1.1 should have parentId equal to the WBS code of its parent (1)
    const act1_1 = result.activities.find(a => a.wbsCode === '1.1')!
    const act1 = result.activities.find(a => a.wbsCode === '1')!
    expect(act1_1.parentId).toBe(act1.wbsCode)
  })

  it('detects milestone from Milestone column Y', () => {
    const csv = `WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1.1,Some Milestone,0,,,,,,,,Y
1.2,Regular Task,10,,,,,,,,N
`
    const result = parseProgrammeCSV(csv)
    expect(result.activities[0].isMilestone).toBe(true)
    expect(result.activities[1].isMilestone).toBe(false)
  })

  it('uses provided projectId', () => {
    const result = parseProgrammeCSV(sampleCSV, 'proj-123')
    result.activities.forEach(a => {
      expect(a.projectId).toBe('proj-123')
    })
    result.dependencies.forEach(d => {
      expect(d.projectId).toBe('proj-123')
    })
  })

  it('returns empty result for empty CSV', () => {
    const result = parseProgrammeCSV('')
    expect(result.activities).toHaveLength(0)
    expect(result.dependencies).toHaveLength(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('warns on unresolved predecessor references', () => {
    const csv = `WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Task A,10,,,,,,,,N
2,Task B,10,,,99,FS,0,,,,N
`
    const result = parseProgrammeCSV(csv)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('99')
    // Only valid dep from 99->2 should be skipped
    expect(result.dependencies).toHaveLength(0)
  })
})
