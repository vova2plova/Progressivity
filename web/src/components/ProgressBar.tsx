import * as Progress from '@radix-ui/react-progress'
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

  const getColor = (percent: number) => {
    if (percent >= 100) return 'bg-green-500'
    if (percent >= 75) return 'bg-green-400'
    if (percent >= 50) return 'bg-yellow-400'
    if (percent > 0) return 'bg-blue-400'
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
      <Progress.Root
        className={`relative overflow-hidden bg-gray-200 rounded-full w-full ${heightClass}`}
        value={progress}
      >
        <Progress.Indicator
          className={`w-full h-full transition-all duration-300 ${getColor(progress)}`}
          style={{ transform: `translateX(-${100 - progress}%)` }}
        />
      </Progress.Root>
      {isContainer && task.totalChildren! > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Average progress across {task.totalChildren} subtasks
        </div>
      )}
    </div>
  )
}
