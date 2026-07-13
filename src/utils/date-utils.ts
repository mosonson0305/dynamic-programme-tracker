/**
 * Date utility functions. All operations use UTC to avoid timezone shifts.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
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
  return dateStr
}
