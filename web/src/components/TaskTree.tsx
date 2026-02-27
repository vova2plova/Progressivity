import type { TaskWithProgress } from '../types'
import { ProgressBar } from './ProgressBar'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

interface TaskTreeProps {
  tasks: TaskWithProgress[]
  depth?: number
}

export function TaskTree({ tasks, depth = 0 }: TaskTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpand = (taskId: string) => {
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  if (tasks.length === 0) {
    return <div className="text-gray-500 text-center py-4">No tasks</div>
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const hasChildren = task.children && task.children.length > 0
        const isExpanded = expanded[task.id]

        return (
          <div key={task.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="bg-white p-4 hover:bg-gray-50"
              style={{ paddingLeft: `${depth * 24 + 16}px` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {hasChildren && (
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {!hasChildren && <div className="w-7" />}
                  <Link
                    to={`/task/${task.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {task.title}
                  </Link>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {task.type}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-48">
                    <ProgressBar task={task} showLabel={false} size="sm" />
                  </div>
                  <div className="text-sm text-gray-500">{task.progress.toFixed(0)}%</div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              {task.description && (
                <div className="mt-2 text-gray-600 text-sm" style={{ marginLeft: '28px' }}>
                  {task.description}
                </div>
              )}
              <div
                className="mt-3 flex items-center space-x-4 text-sm text-gray-500"
                style={{ marginLeft: '28px' }}
              >
                {task.unit && task.targetValue && (
                  <span>
                    {task.unit}: {task.targetValue}
                  </span>
                )}
                {task.type === 'container' && <span>{task.totalChildren || 0} subtasks</span>}
                {task.deadline && <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>}
              </div>
            </div>
            {hasChildren && isExpanded && (
              <div className="bg-gray-50 border-t">
                <TaskTree tasks={task.children!} depth={depth + 1} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
