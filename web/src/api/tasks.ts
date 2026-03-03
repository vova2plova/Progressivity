import { apiClient } from './client'
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
    const { data } = await apiClient.get<TaskWithProgress[]>('/tasks')
    return data
  },

  // Create a new top-level or child task
  createTask: async (taskData: CreateTaskRequest): Promise<Task> => {
    if (taskData.parentId) {
      const { data } = await apiClient.post<Task>(`/tasks/${taskData.parentId}/children`, taskData)
      return data
    }
    const { data } = await apiClient.post<Task>('/tasks', taskData)
    return data
  },

  // Get a specific task by ID
  getTask: async (id: UUID): Promise<TaskWithProgress> => {
    const { data } = await apiClient.get<TaskWithProgress>(`/tasks/${id}`)
    return data
  },

  // Update a task
  updateTask: async (id: UUID, taskData: UpdateTaskRequest): Promise<Task> => {
    const { data } = await apiClient.put<Task>(`/tasks/${id}`, taskData)
    return data
  },

  // Delete a task
  deleteTask: async (id: UUID): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },

  // Get children of a task
  getChildren: async (id: UUID): Promise<TaskWithProgress[]> => {
    const { data } = await apiClient.get<TaskWithProgress[]>(`/tasks/${id}/children`)
    return data
  },

  // Get full tree for a task
  getTaskTree: async (id: UUID): Promise<TaskWithProgress> => {
    const { data } = await apiClient.get<TaskWithProgress>(`/tasks/${id}/tree`)
    return data
  },

  // Reorder a task
  reorderTask: async (id: UUID, payload: ReorderTaskRequest): Promise<void> => {
    await apiClient.patch(`/tasks/${id}/reorder`, payload)
  },
}
