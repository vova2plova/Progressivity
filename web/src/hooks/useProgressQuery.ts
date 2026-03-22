import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { progressApi } from '../api/progress'
import { createOptimisticProgressEntry, removeProgressEntry, replaceProgressEntry, sortProgressEntries, updateProgressSnapshot } from '../lib/task-cache'
import type { CreateProgressRequest, ProgressEntry, TaskWithProgress, UUID } from '../types'
import { TASK_KEYS } from './useTasksQuery'

export const PROGRESS_KEYS = {
  all: ['progress'] as const,
  byTask: (taskId: UUID) => [...PROGRESS_KEYS.all, 'task', taskId] as const,
}

interface AddProgressContext {
  previousEntries?: ProgressEntry[]
  previousDetail?: TaskWithProgress
  previousTree?: TaskWithProgress
  tempId: UUID
  taskId: UUID
}

interface DeleteProgressContext {
  previousEntries?: ProgressEntry[]
  previousDetail?: TaskWithProgress
  previousTree?: TaskWithProgress
  removedEntry?: ProgressEntry
  taskId?: UUID
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
    onMutate: async ({ taskId, data }): Promise<AddProgressContext> => {
      await queryClient.cancelQueries({ queryKey: PROGRESS_KEYS.byTask(taskId) })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.detail(taskId) })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.tree(taskId) })

      const previousEntries = queryClient.getQueryData<ProgressEntry[]>(PROGRESS_KEYS.byTask(taskId))
      const previousDetail = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(taskId))
      const previousTree = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.tree(taskId))

      const tempId = `temp-progress-${Date.now()}`
      const optimisticEntry = createOptimisticProgressEntry({
        id: tempId,
        taskId,
        value: data.value,
        note: data.note,
        recordedAt: data.recordedAt,
      })

      queryClient.setQueryData(PROGRESS_KEYS.byTask(taskId), (current?: ProgressEntry[]) =>
        sortProgressEntries([...(current ?? []), optimisticEntry]),
      )
      queryClient.setQueryData(TASK_KEYS.detail(taskId), (current?: TaskWithProgress) =>
        updateProgressSnapshot(current, data.value),
      )
      queryClient.setQueryData(TASK_KEYS.tree(taskId), (current?: TaskWithProgress) =>
        updateProgressSnapshot(current, data.value),
      )

      return { previousEntries, previousDetail, previousTree, tempId, taskId }
    },
    onError: (_error, _variables, context) => {
      if (!context) return

      queryClient.setQueryData(PROGRESS_KEYS.byTask(context.taskId), context.previousEntries)
      queryClient.setQueryData(TASK_KEYS.detail(context.taskId), context.previousDetail)
      queryClient.setQueryData(TASK_KEYS.tree(context.taskId), context.previousTree)
    },
    onSuccess: (entry, _variables, context) => {
      if (!context) return

      queryClient.setQueryData(PROGRESS_KEYS.byTask(context.taskId), (current?: ProgressEntry[]) =>
        replaceProgressEntry(current, context.tempId, entry),
      )
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: PROGRESS_KEYS.byTask(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
    },
  })
}

export function useDeleteProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: UUID) => progressApi.deleteProgress(id),
    onMutate: async (id): Promise<DeleteProgressContext> => {
      const progressEntries = queryClient.getQueriesData<ProgressEntry[]>({ queryKey: PROGRESS_KEYS.all })
      const matched = progressEntries.find(([, entries]) => entries?.some((entry) => entry.id === id))
      const previousEntries = matched?.[1]
      const key = matched?.[0]
      const taskId = Array.isArray(key) ? (key[key.length - 1] as UUID) : undefined
      const removedEntry = previousEntries?.find((entry) => entry.id === id)

      if (!taskId || !removedEntry) {
        return {}
      }

      await queryClient.cancelQueries({ queryKey: PROGRESS_KEYS.byTask(taskId) })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.detail(taskId) })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.tree(taskId) })

      const previousDetail = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(taskId))
      const previousTree = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.tree(taskId))

      queryClient.setQueryData(PROGRESS_KEYS.byTask(taskId), (current?: ProgressEntry[]) =>
        removeProgressEntry(current, id),
      )
      queryClient.setQueryData(TASK_KEYS.detail(taskId), (current?: TaskWithProgress) =>
        updateProgressSnapshot(current, -removedEntry.value),
      )
      queryClient.setQueryData(TASK_KEYS.tree(taskId), (current?: TaskWithProgress) =>
        updateProgressSnapshot(current, -removedEntry.value),
      )

      return { previousEntries, previousDetail, previousTree, removedEntry, taskId }
    },
    onError: (_error, _id, context) => {
      if (!context?.taskId) return

      queryClient.setQueryData(PROGRESS_KEYS.byTask(context.taskId), context.previousEntries)
      queryClient.setQueryData(TASK_KEYS.detail(context.taskId), context.previousDetail)
      queryClient.setQueryData(TASK_KEYS.tree(context.taskId), context.previousTree)
    },
    onSettled: (_data, _error, _id, context) => {
      if (!context?.taskId) {
        queryClient.invalidateQueries({ queryKey: PROGRESS_KEYS.all })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
        return
      }

      queryClient.invalidateQueries({ queryKey: PROGRESS_KEYS.byTask(context.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(context.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(context.taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
    },
  })
}
