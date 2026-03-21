import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTaskData, useTasksData } from '../hooks/useFeatureFlaggedData'
import type { TaskStatus } from '../types'
import {
  ProgressBar,
  TaskTree,
  CreateTaskForm,
  EditTaskForm,
  DeleteConfirmDialog,
  AddProgressForm,
  ProgressHistory,
  EmptyState,
} from '../components'
import { FolderPlus, BarChart } from 'lucide-react'

export function TaskPage() {
  const { id } = useParams<{ id: string }>()
  const { task, isLoading, error } = useTaskData(id)
  const { updateTask } = useTasksData()
  const { task: parentTask } = useTaskData(task?.parentId || undefined)

  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [addProgressOpen, setAddProgressOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Loading task...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <div className="text-lg">Error loading task: {error.message}</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Task not found</h2>
        <Link to="/" className="text-blue-600 hover:underline">
          Return to dashboard
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link to="/" className="hover:text-blue-600">
              Dashboard
            </Link>
            {parentTask && (
              <>
                <span>/</span>
                <Link to={`/task/${parentTask.id}`} className="hover:text-blue-600">
                  {parentTask.title}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="font-medium text-gray-700">{task.title}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                {task.description && <p className="text-gray-600 text-lg">{task.description}</p>}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mb-8 max-w-2xl">
              <ProgressBar task={task} size="lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-500 mb-1">Status</div>
                <select
                  className="w-full font-medium text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                  value={task.status}
                  onChange={(e) => {
                    updateTask(task.id, { status: e.target.value as TaskStatus })
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-500 mb-1">Type</div>
                <div className="font-medium text-gray-900">{task.type}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-500 mb-1">Deadline</div>
                <div className="font-medium text-gray-900">
                  {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Subtasks</h2>
                <button
                  onClick={() => setCreateSubtaskOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add Subtask
                </button>
              </div>
              {task.children && task.children.length > 0 ? (
                <TaskTree tasks={task.children} />
              ) : (
                <EmptyState
                  icon={FolderPlus}
                  title="No subtasks yet"
                  description="Add your first subtask to break down this goal."
                  className="py-8"
                />
              )}
            </div>
          </div>

          <div className="space-y-8">
            {task.type === 'leaf' && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Add Progress</h2>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Track your progress by adding entries with values and notes.
                    </p>
                    <button
                      onClick={() => setAddProgressOpen(true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Add Progress Entry
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Progress History</h2>
                  <ProgressHistory taskId={task.id} />
                </div>
              </>
            )}
            {task.type === 'container' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Progress History</h2>
                <EmptyState
                  icon={BarChart}
                  title="Progress history"
                  description="Progress history is available for leaf tasks only."
                  className="py-8"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTaskForm
        open={createSubtaskOpen}
        onOpenChange={setCreateSubtaskOpen}
        parentId={task.id}
      />
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        taskId={task.id}
        taskTitle={task.title}
      />
      <EditTaskForm open={editModalOpen} onOpenChange={setEditModalOpen} task={task} />
      <AddProgressForm open={addProgressOpen} onOpenChange={setAddProgressOpen} taskId={task.id} />
    </>
  )
}
