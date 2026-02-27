import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useProgress } from '../store'
import type { CreateProgressRequest } from '../types'

interface AddProgressFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
}

export function AddProgressForm({ open, onOpenChange, taskId }: AddProgressFormProps) {
  const { addProgress } = useProgress()
  const [form, setForm] = useState<CreateProgressRequest>({
    value: 0,
    note: '',
    recordedAt: new Date().toISOString().split('T')[0],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      addProgress(taskId, form)
      onOpenChange(false)
      setForm({
        value: 0,
        note: '',
        recordedAt: new Date().toISOString().split('T')[0],
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof CreateProgressRequest, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold text-gray-900">Add Progress</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.value}
                onChange={(e) => handleChange('value', Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="What did you accomplish?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recorded Date</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.recordedAt}
                onChange={(e) => handleChange('recordedAt', e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Dialog.Close className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Progress'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
