import { describe, it, expect } from 'vitest'
import { addDays, daysBetween, todayStr, compareDates, maxDate, dateToDisplay } from './date-utils'

describe('addDays', () => {
  it('adds calendar days', () => {
    expect(addDays('2026-01-01', 5)).toBe('2026-01-06')
  })

  it('handles month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
  })

  it('handles zero', () => {
    expect(addDays('2026-06-15', 0)).toBe('2026-06-15')
  })

  it('handles negative days', () => {
    expect(addDays('2026-01-10', -5)).toBe('2026-01-05')
  })

  it('handles year boundary', () => {
    expect(addDays('2025-12-30', 5)).toBe('2026-01-04')
  })
})

describe('daysBetween', () => {
  it('calculates positive difference', () => {
    expect(daysBetween('2026-01-01', '2026-01-10')).toBe(9)
  })

  it('returns negative if end before start', () => {
    expect(daysBetween('2026-01-10', '2026-01-01')).toBe(-9)
  })

  it('returns zero for same day', () => {
    expect(daysBetween('2026-06-15', '2026-06-15')).toBe(0)
  })
})

describe('todayStr', () => {
  it('returns YYYY-MM-DD format', () => {
    const t = todayStr()
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('compareDates', () => {
  it('returns -1 when a < b', () => {
    expect(compareDates('2026-01-01', '2026-01-10')).toBe(-1)
  })

  it('returns 1 when a > b', () => {
    expect(compareDates('2026-01-10', '2026-01-01')).toBe(1)
  })

  it('returns 0 when a === b', () => {
    expect(compareDates('2026-06-15', '2026-06-15')).toBe(0)
  })
})

describe('maxDate', () => {
  it('returns later date when a > b', () => {
    expect(maxDate('2026-01-10', '2026-01-01')).toBe('2026-01-10')
  })

  it('returns later date when b > a', () => {
    expect(maxDate('2026-01-01', '2026-01-10')).toBe('2026-01-10')
  })

  it('returns either when equal', () => {
    expect(maxDate('2026-06-15', '2026-06-15')).toBe('2026-06-15')
  })
})

describe('dateToDisplay', () => {
  it('returns MM-DD substring', () => {
    expect(dateToDisplay('2026-01-15')).toBe('01-15')
  })

  it('returns correct substring for end of year', () => {
    expect(dateToDisplay('2026-12-31')).toBe('12-31')
  })
})
