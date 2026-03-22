import type { TaskWithProgress } from '../types'

interface ProgressBarProps {
  task: TaskWithProgress
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({ task, showLabel = true, size = 'md' }: ProgressBarProps) {
  const progress = task.progress || 0
  const isContainer = task.type === 'container'
  const hasTarget = task.targetValue !== null

  const heightClass = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }[size]

  const negativeWidth = `${Math.min(Math.abs(Math.min(progress, 0)), 100)}%`
  const positiveWidth = `${Math.min(Math.max(progress, 0), 100)}%`
  const overWidth = `${Math.min(Math.max(progress - 100, 0), 100)}%`

  const getColor = (percent: number) => {
    if (percent > 100) return 'bg-emerald-500'
    if (percent >= 100) return 'bg-green-500'
    if (percent >= 75) return 'bg-green-400'
    if (percent >= 50) return 'bg-yellow-400'
    if (percent > 0) return 'bg-blue-400'
    if (percent < 0) return 'bg-rose-500'
    return 'bg-gray-300'
  }

  const renderLabel = () => {
    if (!showLabel) return null

    if (isContainer && task.completedChildren !== undefined && task.totalChildren !== undefined) {
      return (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>
            {task.completedChildren} of {task.totalChildren} completed
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
      )
    }

    if (hasTarget && task.unit) {
      // For leaf tasks with target, we could show "120 / 300 pages"
      // But we don't have current total value here; would need task.sumProgress
      return (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{task.unit}</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
      )
    }

    return (
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Progress</span>
        <span>{progress.toFixed(0)}%</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      {renderLabel()}
      <div className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.5rem] ${heightClass}`}>
        <div className="relative overflow-hidden rounded-l-full bg-rose-100">
          <div
            data-testid="negative-progress-indicator"
            className={`absolute top-0 right-0 h-full transition-all duration-300 ${getColor(progress)}`}
            style={{ width: negativeWidth }}
          />
        </div>
        <div className="relative overflow-hidden bg-gray-200">
          <div
            data-testid="positive-progress-indicator"
            className={`absolute top-0 left-0 h-full transition-all duration-300 ${getColor(Math.max(progress, 0))}`}
            style={{ width: positiveWidth }}
          />
        </div>
        <div className="relative overflow-hidden rounded-r-full bg-emerald-100">
          <div
            data-testid="over-progress-indicator"
            className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-300"
            style={{ width: overWidth }}
          />
        </div>
      </div>
      {isContainer && task.totalChildren! > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Average progress across {task.totalChildren} subtasks
        </div>
      )}
    </div>
  )
}
