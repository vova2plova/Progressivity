import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTasks } from '../store'
import type { UpdateTaskRequest, TaskWithProgress } from '../types'

interface EditTaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: TaskWithProgress
}

export function EditTaskForm({ open, onOpenChange, task }: EditTaskFormProps) {
  const { updateTask } = useTasks()
  const [form, setForm] = useState<UpdateTaskRequest>({
    title: '',
    description: null,
    unit: null,
    targetValue: null,
    deadline: null,
    status: task.status,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && task) {
      setForm({
        title: task.title,
        description: task.description,
        unit: task.unit,
        targetValue: task.targetValue,
        deadline: task.deadline,
        status: task.status,
      })
    }
  }, [open, task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      updateTask(task.id, form)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof UpdateTaskRequest, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold text-gray-900">Edit Task</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Read 10 books"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                value={form.description || ''}
                onChange={(e) => handleChange('description', e.target.value || null)}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.unit || ''}
                  onChange={(e) => handleChange('unit', e.target.value || null)}
                  placeholder="pages, km, hours"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.targetValue || ''}
                  onChange={(e) =>
                    handleChange('targetValue', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="Optional"
                  min="0"
                  step="any"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.deadline || ''}
                onChange={(e) => handleChange('deadline', e.target.value || null)}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Dialog.Close className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
