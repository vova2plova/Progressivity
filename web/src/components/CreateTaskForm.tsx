import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTasksData } from '../hooks/useFeatureFlaggedData'
import { useToast } from './ToastProvider'
import type { CreateTaskRequest } from '../types'
import { getErrorMessage } from '../lib/error'

interface CreateTaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId?: string | null
}

export function CreateTaskForm({ open, onOpenChange, parentId = null }: CreateTaskFormProps) {
  const { createTask, createTaskPending } = useTasksData()
  const { showErrorToast, showSuccessToast } = useToast()
  const [form, setForm] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    unit: '',
    targetValue: null,
    deadline: null,
    parentId,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createTask(form)
      showSuccessToast(parentId ? 'Subtask created' : 'Goal created')
      onOpenChange(false)
      setForm({
        title: '',
        description: '',
        unit: '',
        targetValue: null,
        deadline: null,
        parentId,
      })
    } catch (error) {
      showErrorToast('Could not create task', getErrorMessage(error))
    }
  }

  const handleChange = (field: keyof CreateTaskRequest, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] max-h-[85vh] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              {parentId ? 'Create Subtask' : 'Create New Goal'}
            </Dialog.Title>
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
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Read 10 books"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
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
                disabled={createTaskPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {createTaskPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
