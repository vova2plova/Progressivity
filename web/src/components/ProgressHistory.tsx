import { useProgressData } from '../hooks/useFeatureFlaggedData'
import { Trash2, History } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'
import { useToast } from './ToastProvider'
import { getErrorMessage } from '../lib/error'

interface ProgressHistoryProps {
  taskId: string
}

export function ProgressHistory({ taskId }: ProgressHistoryProps) {
  const { entries, deleteProgress, deleteProgressPending, isLoading } = useProgressData(taskId)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { showErrorToast, showSuccessToast } = useToast()

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteProgress(id)
      showSuccessToast('Progress entry deleted')
    } catch (error) {
      showErrorToast('Could not delete progress entry', getErrorMessage(error))
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No progress entries yet"
        description="Add your first progress entry to track your work."
        className="py-8"
      />
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`rounded-lg border p-4 transition ${
            'isOptimistic' in entry && entry.isOptimistic
              ? 'border-blue-200 bg-blue-50/70 opacity-80'
              : 'border-gray-200 bg-gray-50'
          } flex items-center justify-between`}
        >
          <div>
            <div className="font-medium text-gray-900">{entry.value} units</div>
            {entry.note && <div className="text-gray-600 text-sm mt-1">{entry.note}</div>}
            <div className="text-gray-500 text-xs mt-2">
              Recorded: {new Date(entry.recordedAt).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => handleDelete(entry.id)}
            disabled={deletingId === entry.id || deleteProgressPending}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
