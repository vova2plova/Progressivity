import { describe, expect, it } from 'vitest'
import { toApiDateTime, toDateInputValue, todayDateInputValue } from './date'

describe('date helpers', () => {
  it('converts date-only values to UTC midnight API timestamps without shifting the day', () => {
    expect(toApiDateTime('2026-03-22')).toBe('2026-03-22T00:00:00Z')
  })

  it('keeps RFC3339 timestamps unchanged for API payloads', () => {
    expect(toApiDateTime('2026-03-22T15:04:05Z')).toBe('2026-03-22T15:04:05Z')
  })

  it('normalizes API timestamps for date inputs', () => {
    expect(toDateInputValue('2026-03-22T00:00:00Z')).toBe('2026-03-22')
    expect(toDateInputValue('2026-03-22')).toBe('2026-03-22')
  })

  it('builds today values from local calendar fields', () => {
    const now = new Date(2026, 2, 22, 23, 45, 0)
    expect(todayDateInputValue(now)).toBe('2026-03-22')
  })
})
