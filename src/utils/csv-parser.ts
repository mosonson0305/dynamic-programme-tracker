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

  const rows = lines.slice(1)
  const warnings: string[] = []
  const activities: Activity[] = []
  const depRows: Array<{ row: number; preds: string[]; succWbs: string; relation: string; lag: number }> = []

  for (let i = 0; i < rows.length; i++) {
    const values = rows[i].split(',').map(v => v.trim())
    if (values.length < 2 || !values[0]) continue

    // Pad values to 11 columns (some CSVs may omit trailing empty columns)
    while (values.length < 11) values.push('')

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
