import { useTasks as useTasksMock, useProgress as useProgressMock } from '../store'
import {
  useTasks as useTasksQuery,
  useTask as useTaskQuery,
  useTaskTree as useTaskTreeQuery,
  useCreateTask as useCreateTaskQuery,
  useUpdateTask as useUpdateTaskQuery,
  useDeleteTask as useDeleteTaskQuery,
  useReorderTask as useReorderTaskQuery,
} from './useTasksQuery'
import {
  useProgress as useProgressQueryHook,
  useAddProgress as useAddProgressQuery,
  useDeleteProgress as useDeleteProgressQuery,
} from './useProgressQuery'
import type { UUID, CreateTaskRequest, UpdateTaskRequest, CreateProgressRequest } from '../types'

// Set this to true to use the mock store, false to use the real API
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// --- Tasks Hooks Wrapper ---

export function useTasksData() {
  const mock = useTasksMock()
  const queryTasks = useTasksQuery()
  const createMutation = useCreateTaskQuery()
  const updateMutation = useUpdateTaskQuery()
  const deleteMutation = useDeleteTaskQuery()
  const reorderMutation = useReorderTaskQuery()

  if (USE_MOCKS) {
    return {
      rootTasks: mock.rootTasks,
      isLoading: false,
      error: null,
      getTask: mock.getTask,
      getTaskWithProgress: mock.getTaskWithProgress,
      getChildren: mock.getChildren,
      getTaskTree: mock.getTaskTree,
      createTask: async (data: CreateTaskRequest) => mock.createTask(data),
      updateTask: async (id: UUID, data: UpdateTaskRequest) => mock.updateTask(id, data),
      deleteTask: async (id: UUID) => mock.deleteTask(id),
      reorderTask: async (id: UUID, newPosition: number, newParentId?: UUID | null) =>
        mock.reorderTask(id, newPosition, newParentId),
    }
  }

  return {
    rootTasks: queryTasks.data || [],
    isLoading: queryTasks.isLoading,
    error: queryTasks.error,
    // Note: for individual queries we'd typically use specialized hooks directly in components
    // but we provide wrappers here to match the mock signature for now
    getTask: () => null, // Placeholder, see useTaskData
    getTaskWithProgress: () => null,
    getChildren: () => [],
    getTaskTree: () => null,
    createTask: createMutation.mutateAsync,
    updateTask: (id: UUID, data: UpdateTaskRequest) => updateMutation.mutateAsync({ id, data }),
    deleteTask: deleteMutation.mutateAsync,
    reorderTask: (id: UUID, newPosition: number, newParentId?: UUID | null) =>
      reorderMutation.mutateAsync({ id, data: { newPosition, newParentId } }),
  }
}

// Individual task data hook
export function useTaskData(id?: string) {
  const mock = useTasksMock()
  const query = useTaskQuery(id || '')
  const treeQuery = useTaskTreeQuery(id || '')

  if (USE_MOCKS) {
    const task = id ? mock.getTaskWithProgress(id) : undefined
    return {
      task,
      isLoading: false,
      error: null,
    }
  }

  return {
    task: treeQuery.data || query.data, // Tree includes children
    isLoading: query.isLoading || treeQuery.isLoading,
    error: query.error || treeQuery.error,
  }
}

// --- Progress Hooks Wrapper ---

export function useProgressData(taskId?: string) {
  const mock = useProgressMock()
  const query = useProgressQueryHook(taskId || '')
  const addMutation = useAddProgressQuery()
  const deleteMutation = useDeleteProgressQuery()

  if (USE_MOCKS) {
    return {
      entries: taskId ? mock.getProgressEntries(taskId) : [],
      isLoading: false,
      addProgress: async (taskId: UUID, data: CreateProgressRequest) =>
        mock.addProgress(taskId, data),
      deleteProgress: async (id: UUID) => mock.deleteProgress(id),
    }
  }

  return {
    entries: query.data || [],
    isLoading: query.isLoading,
    addProgress: (taskId: UUID, data: CreateProgressRequest) =>
      addMutation.mutateAsync({ taskId, data }),
    deleteProgress: deleteMutation.mutateAsync,
  }
}
