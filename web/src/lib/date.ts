export function toDateInputValue(value?: string | null): string {
  if (!value) {
    return ''
  }

  return value.includes('T') ? value.slice(0, 10) : value
}

export function toApiDateTime(value?: string | null): string | null {
  if (!value) {
    return null
  }

  return value.includes('T') ? value : `${value}T00:00:00Z`
}

export function todayDateInputValue(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
