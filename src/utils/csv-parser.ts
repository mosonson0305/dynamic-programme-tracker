import type { Activity, Dependency } from '../models'

export interface ParseResult {
  activities: Activity[]
  dependencies: Dependency[]
  warnings: string[]
}

/**
 * Parse a programme CSV (comma or tab delimited).
 * Auto-detects delimiter and column mapping.
 */
export function parseProgrammeCSV(csvText: string, projectId?: string): ParseResult {
  // 1. Normalize line endings and detect delimiter
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter(l => l.trim().length > 0)
  if (lines.length < 1) {
    return { activities: [], dependencies: [], warnings: ['CSV is empty'] }
  }

  // Detect delimiter: if first line has tabs, use tab
  const firstLine = lines[0]
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = tabCount > commaCount ? '\t' : ','

  const headers = splitRow(firstLine, delimiter)
  if (headers.length < 2) {
    return { activities: [], dependencies: [], warnings: ['Could not parse headers. Check CSV format.'] }
  }

  // 2. Map columns to fields
  const colMap = mapColumns(headers)

  // 3. Parse data rows
  const warnings: string[] = []
  const activities: Activity[] = []
  const depRows: Array<{ row: number; preds: string[]; succIdx: number; relation: string; lag: number }> = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i], delimiter)
    if (values.length < 2) continue

    const wbsCode = getCol(values, colMap.wbs, '') || getCol(values, colMap.id, '') || String(i)
    const name = getCol(values, colMap.name, '') || `Activity ${i}`
    const duration = parseDuration(getCol(values, colMap.duration, '0'))
    const startDate = parseDate(getCol(values, colMap.start, ''))
    const finishDate = parseDate(getCol(values, colMap.finish, ''))
    const predecessors = getCol(values, colMap.preds, '')
    const relation = getCol(values, colMap.relation, 'FS')
    const lag = parseInt(getCol(values, colMap.lag, '0')) || 0
    const constraintType = getCol(values, colMap.constraint, 'ASAP')
    const constraintDate = parseDate(getCol(values, colMap.constraintDate, ''))
    const isMilestone = getCol(values, colMap.milestone, 'N').toUpperCase() === 'Y'
    const percentComplete = parseFloat(getCol(values, colMap.pct, '0')) || 0

    // Generate deterministic UUID
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
      percentComplete,
      earlyStart: null,
      earlyFinish: null,
      lateStart: null,
      lateFinish: null,
      totalFloat: 0,
      isCritical: false,
      isMilestone: duration === 0 || isMilestone,
      constraintType: constraintType as Activity['constraintType'],
      constraintDate,
      status: percentComplete >= 100 ? 'completed' : percentComplete > 0 ? 'in_progress' : 'not_started' as Activity['status'],
      wbsLevel: wbsCode.split('.').length,
      bimRef: null,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    })

    if (predecessors && predecessors.trim()) {
      const predList = predecessors.split(/[;,]/).map(p => p.trim()).filter(Boolean)
      if (predList.length > 0) {
        depRows.push({ row: i, preds: predList, succIdx: activities.length - 1, relation, lag })
      }
    }
  }

  // 4. Build WBS → activity index lookup (by WBS code AND by original ID)
  const lookup = new Map<string, string>() // lookup string → activity UUID
  for (const a of activities) {
    lookup.set(a.wbsCode, a.id)
    // Also index by just the numeric part for cross-reference
    const numMatch = a.wbsCode.match(/^(\d+)$/)
    if (numMatch) lookup.set(numMatch[1], a.id)
  }

  // 5. Resolve dependencies
  const dependencies: Dependency[] = []
  for (const dr of depRows) {
    for (const predRef of dr.preds) {
      const predId = lookup.get(predRef)
      if (!predId) {
        warnings.push(`Row ${dr.row + 1}: predecessor "${predRef}" not found`)
        continue
      }
      const succAct = activities[dr.succIdx]
      if (!succAct) continue
      dependencies.push({
        id: generateDeterministicUUID(`${predId}-${succAct.id}`),
        projectId: projectId || 'default',
        predecessorId: predId,
        successorId: succAct.id,
        relationType: dr.relation as Dependency['relationType'],
        lagDays: dr.lag,
      })
    }
  }

  return { activities, dependencies, warnings }
}

// ─── Helpers ──────────────────────────────────────────────────────

function splitRow(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

interface ColMap {
  wbs: number
  id: number
  name: number
  duration: number
  start: number
  finish: number
  preds: number
  relation: number
  lag: number
  constraint: number
  constraintDate: number
  milestone: number
  pct: number
}

function mapColumns(headers: string[]): ColMap {
  const h = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  return {
    wbs: findCol(h, ['wbscode', 'wbscode', 'wbs', 'code', 'wbscodeactivityname']),
    id: findCol(h, ['id', 'activityid', 'taskid', 'taskid', 'item']),
    name: findCol(h, ['activityname', 'name', 'taskname', 'description', 'title', 'activity', 'task', 'wbscodeactivityname']),
    duration: findCol(h, ['duration', 'dur', 'days', 'originalduration', 'plannedduration']),
    start: findCol(h, ['startdate', 'start', 'plannedstart', 'baselinestart', 'earlystart']),
    finish: findCol(h, ['finishdate', 'finish', 'plannedfinish', 'baselinefinish', 'earlyfinish', 'enddate', 'end']),
    preds: findCol(h, ['predecessors', 'predecessor', 'pred', 'predecessorsrelation', 'dep', 'dependencies']),
    relation: findCol(h, ['relation', 'reltype', 'type', 'dependencytype']),
    lag: findCol(h, ['lag', 'lagdays', 'offset']),
    constraint: findCol(h, ['constraint', 'constrainttype', 'constrtype']),
    constraintDate: findCol(h, ['constraintdate', 'constraint', 'constrdate']),
    milestone: findCol(h, ['milestone', 'ismilestone', 'marker']),
    pct: findCol(h, ['percentcomplete', 'complete', 'progress', 'pct', 'pctcomplete', 'status']),
  }
}

function findCol(headers: string[], patterns: string[]): number {
  for (const p of patterns) {
    const idx = headers.findIndex(h => h === p || h.includes(p))
    if (idx >= 0) return idx
  }
  return -1
}

function getCol(values: string[], idx: number, fallback: string): string {
  if (idx < 0 || idx >= values.length) return fallback
  const v = values[idx]
  // Clean quotes and line breaks inside quoted fields
  return v.replace(/^"|"$/g, '').replace(/\n/g, ' ').trim()
}

function parseDuration(raw: string): number {
  if (!raw) return 0
  // "152 days" → 152, "1 day" → 1, "0.5 days" → 0 (round to 1 for safety)
  const cleaned = raw.replace(/"/g, '').replace(/\n/g, ' ').trim().toLowerCase()
  const match = cleaned.match(/^([\d.]+)\s*d(?:ay)?s?/)
  if (match) {
    const val = parseFloat(match[1])
    return Math.max(1, Math.round(val))
  }
  // Plain number
  const num = parseInt(cleaned) 
  return isNaN(num) ? 0 : num
}

function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  const cleaned = raw.replace(/"/g, '').replace(/\n/g, ' ').trim()

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned

  // Try "Mon 10/08/26" or "Mon 10/8/26"
  const withDay = cleaned.match(/(?:mon|tue|wed|thu|fri|sat|sun)\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i)
  if (withDay) {
    const [, d, m, y] = withDay
    return normalizeDate(d, m, y)
  }

  // Try "10/08/26" or "10/08/2026" or "10-08-26"
  const slash = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (slash) {
    const [, d, m, y] = slash
    return normalizeDate(d, m, y)
  }

  // Try "2026-08-10" alternative formats
  const iso = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return normalizeDate(d, m, y)
  }

  // Try "Aug 10, 2026" or "10 Aug 2026"
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return null
}

function normalizeDate(d: string, m: string, y: string): string {
  const day = parseInt(d)
  const month = parseInt(m)
  let year = parseInt(y)
  if (year < 100) year += 2000
  if (year < 2000 || year > 2100) return null as any
  if (month < 1 || month > 12) return null as any
  if (day < 1 || day > 31) return null as any
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function getParentWbs(wbsCode: string): string | undefined {
  const parts = wbsCode.split('.')
  if (parts.length <= 1) return undefined
  return parts.slice(0, -1).join('.')
}

function generateDeterministicUUID(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `${hex}-0000-4000-8000-${'0'.repeat(12)}`
}
