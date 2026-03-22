import { apiClient } from './client'
import { mapApiProgressEntry, mapProgressPayload } from './mappers'
import type { UUID, ProgressEntry, CreateProgressRequest } from '../types'

export const progressApi = {
  // Get history of progress entries for a task
  getProgressByTaskId: async (taskId: UUID): Promise<ProgressEntry[]> => {
    const { data } = await apiClient.get(`/tasks/${taskId}/progress`)
    return data.map(mapApiProgressEntry)
  },

  // Add progress entry to a leaf task
  addProgress: async (taskId: UUID, data: CreateProgressRequest): Promise<ProgressEntry> => {
    const response = await apiClient.post(`/tasks/${taskId}/progress`, mapProgressPayload(data))
    return mapApiProgressEntry(response.data)
  },

  // Delete a progress entry
  deleteProgress: async (id: UUID): Promise<void> => {
    await apiClient.delete(`/progress/${id}`)
  },
}
