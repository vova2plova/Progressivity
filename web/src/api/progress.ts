import { apiClient } from './client'
import type { UUID, ProgressEntry, CreateProgressRequest } from '../types'

export const progressApi = {
  // Get history of progress entries for a task
  getProgressByTaskId: async (taskId: UUID): Promise<ProgressEntry[]> => {
    const { data } = await apiClient.get<ProgressEntry[]>(`/tasks/${taskId}/progress`)
    return data
  },

  // Add progress entry to a leaf task
  addProgress: async (taskId: UUID, data: CreateProgressRequest): Promise<ProgressEntry> => {
    const response = await apiClient.post<ProgressEntry>(`/tasks/${taskId}/progress`, data)
    return response.data
  },

  // Delete a progress entry
  deleteProgress: async (id: UUID): Promise<void> => {
    await apiClient.delete(`/progress/${id}`)
  },
}
