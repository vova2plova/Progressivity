import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { progressApi } from '../api/progress'
import type { UUID, CreateProgressRequest } from '../types'
import { TASK_KEYS } from './useTasksQuery'

export const PROGRESS_KEYS = {
  all: ['progress'] as const,
  byTask: (taskId: UUID) => [...PROGRESS_KEYS.all, 'task', taskId] as const,
}

export function useProgress(taskId: UUID) {
  return useQuery({
    queryKey: PROGRESS_KEYS.byTask(taskId),
    queryFn: () => progressApi.getProgressByTaskId(taskId),
    enabled: !!taskId,
  })
}

export function useAddProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: UUID; data: CreateProgressRequest }) =>
      progressApi.addProgress(taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROGRESS_KEYS.byTask(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(variables.taskId) })
      // Since it might affect parents, invalidate all tasks for simplicity
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}

export function useDeleteProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => progressApi.deleteProgress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROGRESS_KEYS.all })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}
