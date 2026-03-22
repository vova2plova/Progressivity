import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useTasksData } from '../hooks/useFeatureFlaggedData'
import { getErrorMessage } from '../lib/error'
import { useToast } from './ToastProvider'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  taskTitle: string
  onDeleted?: () => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  onDeleted,
}: DeleteConfirmDialogProps) {
  const { deleteTask, deleteTaskPending } = useTasksData()
  const { showErrorToast, showSuccessToast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteTask(taskId)
      showSuccessToast('Task deleted')
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      showErrorToast('Could not delete task', getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl">
          <AlertDialog.Title className="text-xl font-bold text-gray-900 mb-2">
            Delete Task
          </AlertDialog.Title>
          <AlertDialog.Description className="text-gray-600 mb-6">
            Are you sure you want to delete "{taskTitle}"? This action cannot be undone and will
            delete all subtasks and progress entries.
          </AlertDialog.Description>
          <div className="flex justify-end space-x-3">
            <AlertDialog.Cancel className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={handleDelete}
              disabled={isDeleting || deleteTaskPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
            >
              {isDeleting || deleteTaskPending ? 'Deleting...' : 'Delete'}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
