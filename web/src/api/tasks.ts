import { apiClient } from './client'
import { mapApiTask, mapApiTaskWithProgress, mapTaskPayload } from './mappers'
import type {
  UUID,
  Task,
  TaskWithProgress,
  CreateTaskRequest,
  UpdateTaskRequest,
  ReorderTaskRequest,
} from '../types'

export const tasksApi = {
  // Get all root tasks for the current user
  getRootTasks: async (): Promise<TaskWithProgress[]> => {
    const { data } = await apiClient.get('/tasks')
    return data.map(mapApiTaskWithProgress)
  },

  // Create a new top-level or child task
  createTask: async (taskData: CreateTaskRequest): Promise<Task> => {
    const payload = mapTaskPayload(taskData)
    if (taskData.parentId) {
      const { data } = await apiClient.post(`/tasks/${taskData.parentId}/children`, payload)
      return mapApiTask(data)
    }
    const { data } = await apiClient.post('/tasks', payload)
    return mapApiTask(data)
  },

  // Get a specific task by ID
  getTask: async (id: UUID): Promise<TaskWithProgress> => {
    const { data } = await apiClient.get(`/tasks/${id}`)
    return mapApiTaskWithProgress(data)
  },

  // Update a task
  updateTask: async (id: UUID, taskData: UpdateTaskRequest): Promise<Task> => {
    const { data } = await apiClient.put(`/tasks/${id}`, mapTaskPayload(taskData))
    return mapApiTask(data)
  },

  // Delete a task
  deleteTask: async (id: UUID): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },

  // Get children of a task
  getChildren: async (id: UUID): Promise<TaskWithProgress[]> => {
    const { data } = await apiClient.get(`/tasks/${id}/children`)
    return data.map(mapApiTaskWithProgress)
  },

  // Get full tree for a task
  getTaskTree: async (id: UUID): Promise<TaskWithProgress> => {
    const { data } = await apiClient.get(`/tasks/${id}/tree`)
    return mapApiTaskWithProgress(data)
  },

  // Reorder a task
  reorderTask: async (id: UUID, payload: ReorderTaskRequest): Promise<void> => {
    await apiClient.patch(`/tasks/${id}/reorder`, payload)
  },
}
