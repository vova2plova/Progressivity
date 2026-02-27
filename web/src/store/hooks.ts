import { useCallback, useContext, useMemo } from 'react'
import type { UUID, CreateTaskRequest, UpdateTaskRequest, CreateProgressRequest } from '../types'
import { StoreContext } from './store-context'

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return context
}

export function useTasks() {
  const { store, refresh } = useStore()
  const userId = 'user-1' // mock user ID

  const rootTasks = useMemo(
    () => store.listRootTasks(userId).map((task) => store.getTaskWithProgress(task.id)!),
    [store],
  )
  const getTask = useCallback((id: UUID) => store.getTask(id), [store])
  const getTaskWithProgress = useCallback((id: UUID) => store.getTaskWithProgress(id), [store])
  const getChildren = useCallback((parentId: UUID) => store.listChildren(parentId), [store])
  const getTaskTree = useCallback((rootId: UUID) => store.getTaskTree(rootId), [store])

  const createTask = useCallback(
    (data: CreateTaskRequest) => {
      const task = store.createTask(data, userId)
      refresh()
      return task
    },
    [store, refresh],
  )

  const updateTask = useCallback(
    (id: UUID, data: UpdateTaskRequest) => {
      const updated = store.updateTask(id, data)
      if (updated) refresh()
      return updated
    },
    [store, refresh],
  )

  const deleteTask = useCallback(
    (id: UUID) => {
      const deleted = store.deleteTask(id)
      if (deleted) refresh()
      return deleted
    },
    [store, refresh],
  )

  const reorderTask = useCallback(
    (taskId: UUID, newPosition: number, newParentId?: UUID | null) => {
      const success = store.reorderTask(taskId, newPosition, newParentId)
      if (success) refresh()
      return success
    },
    [store, refresh],
  )

  return {
    rootTasks,
    getTask,
    getTaskWithProgress,
    getChildren,
    getTaskTree,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
  }
}

export function useProgress() {
  const { store, refresh } = useStore()

  const getProgressEntries = useCallback(
    (taskId: UUID) => store.getProgressEntriesByTaskId(taskId),
    [store],
  )

  const addProgress = useCallback(
    (taskId: UUID, data: CreateProgressRequest) => {
      const entry = store.addProgress(taskId, data)
      if (entry) refresh()
      return entry
    },
    [store, refresh],
  )

  const deleteProgress = useCallback(
    (id: UUID) => {
      const deleted = store.deleteProgress(id)
      if (deleted) refresh()
      return deleted
    },
    [store, refresh],
  )

  return {
    getProgressEntries,
    addProgress,
    deleteProgress,
  }
}
