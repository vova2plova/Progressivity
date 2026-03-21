import { useProgressData } from '../hooks/useFeatureFlaggedData'
import { Trash2, History } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from './EmptyState'

interface ProgressHistoryProps {
  taskId: string
}

export function ProgressHistory({ taskId }: ProgressHistoryProps) {
  const { entries, deleteProgress, isLoading } = useProgressData(taskId)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div>Loading progress history...</div>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteProgress(id)
    } catch (error) {
      console.error('Failed to delete progress entry:', error)
      // Optionally show error message to user
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
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-center"
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
            disabled={deletingId === entry.id}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
