import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import type { UUID, CreateTaskRequest, UpdateTaskRequest, ReorderTaskRequest } from '../types'

export const TASK_KEYS = {
  all: ['tasks'] as const,
  root: () => [...TASK_KEYS.all, 'root'] as const,
  detail: (id: UUID) => [...TASK_KEYS.all, 'detail', id] as const,
  tree: (id: UUID) => [...TASK_KEYS.all, 'tree', id] as const,
  children: (id: UUID) => [...TASK_KEYS.all, 'children', id] as const,
}

export function useTasks() {
  return useQuery({
    queryKey: TASK_KEYS.root(),
    queryFn: tasksApi.getRootTasks,
  })
}

export function useTask(id: UUID) {
  return useQuery({
    queryKey: TASK_KEYS.detail(id),
    queryFn: () => tasksApi.getTask(id),
    enabled: !!id,
  })
}

export function useTaskTree(id: UUID) {
  return useQuery({
    queryKey: TASK_KEYS.tree(id),
    queryFn: () => tasksApi.getTaskTree(id),
    enabled: !!id,
  })
}

export function useTaskChildren(id: UUID) {
  return useQuery({
    queryKey: TASK_KEYS.children(id),
    queryFn: () => tasksApi.getChildren(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.createTask(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
      if (variables.parentId) {
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.children(variables.parentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(variables.parentId) })
      }
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: UpdateTaskRequest }) =>
      tasksApi.updateTask(id, data),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(updatedTask.id) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
      if (updatedTask.parentId) {
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.children(updatedTask.parentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(updatedTask.parentId) })
      }
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}

export function useReorderTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: ReorderTaskRequest }) =>
      tasksApi.reorderTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
      if (variables.data.newParentId) {
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.children(variables.data.newParentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(variables.data.newParentId) })
      }
    },
  })
}
