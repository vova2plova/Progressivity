import { useState } from 'react'
import { useTasks } from '../store'
import { TaskCard, CreateTaskForm } from '../components'

export function DashboardPage() {
  const { rootTasks } = useTasks()
  const [createModalOpen, setCreateModalOpen] = useState(false)

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
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
            <div className="text-gray-500 text-lg mb-2">No goals yet</div>
            <p className="text-gray-400 mb-6">Create your first goal to start tracking progress</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create First Goal
            </button>
          </div>
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
