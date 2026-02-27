import { Link } from 'react-router-dom'
import type { TaskWithProgress } from '../types'
import { ProgressBar } from './ProgressBar'

interface TaskCardProps {
  task: TaskWithProgress
}

export function TaskCard({ task }: TaskCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            <Link to={`/task/${task.id}`} className="hover:text-blue-600">
              {task.title}
            </Link>
          </h3>
          {task.description && <p className="text-gray-600 mb-4">{task.description}</p>}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
        >
          {formatStatus(task.status)}
        </span>
      </div>

      <div className="mb-6">
        <ProgressBar task={task} />
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          {task.unit && task.targetValue && (
            <div className="flex items-center">
              <span className="font-medium">{task.unit}</span>
              <span className="mx-1">·</span>
              <span>target: {task.targetValue}</span>
            </div>
          )}
          {task.type === 'container' && (
            <div className="flex items-center">
              <span className="font-medium">{task.totalChildren || 0}</span>
              <span className="ml-1">subtasks</span>
            </div>
          )}
        </div>
        <div className="text-gray-400">
          {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
        </div>
      </div>
    </div>
  )
}
