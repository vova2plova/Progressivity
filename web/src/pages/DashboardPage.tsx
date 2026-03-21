import { useState } from 'react'
import { useTasksData } from '../hooks/useFeatureFlaggedData'
import { TaskCard, CreateTaskForm, EmptyState } from '../components'
import { Target } from 'lucide-react'

export function DashboardPage() {
  const { rootTasks, isLoading, error } = useTasksData()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Loading goals...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <div className="text-lg">Error loading goals: {error.message}</div>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Goals</h1>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create New Goal
          </button>
        </div>

        {rootTasks.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first goal to start tracking progress"
            action={
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create First Goal
              </button>
            }
            className="border-2 border-dashed border-gray-300 rounded-xl"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rootTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      <CreateTaskForm open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </>
  )
}
