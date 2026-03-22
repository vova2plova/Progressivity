import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { progressApi } from '../api/progress'
import type { ProgressEntry, TaskWithProgress } from '../types'
import { PROGRESS_KEYS, useAddProgress, useDeleteProgress } from './useProgressQuery'
import { TASK_KEYS } from './useTasksQuery'

vi.mock('../api/progress', () => ({
  progressApi: {
    getProgressByTaskId: vi.fn(),
    addProgress: vi.fn(),
    deleteProgress: vi.fn(),
  },
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const leafTask: TaskWithProgress = {
  id: 'leaf-1',
  userId: 'user-1',
  parentId: 'root-1',
  title: 'Read book',
  description: null,
  status: 'in_progress',
  type: 'leaf',
  unit: 'pages',
  targetValue: 100,
  position: 0,
  deadline: null,
  createdAt: '2026-03-22T00:00:00.000Z',
  updatedAt: '2026-03-22T00:00:00.000Z',
  progress: 20,
}

const existingEntry: ProgressEntry = {
  id: 'progress-1',
  taskId: leafTask.id,
  value: 20,
  note: 'Started',
  recordedAt: '2026-03-21',
  createdAt: '2026-03-21T00:00:00.000Z',
}

describe('useProgressQuery optimistic updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds progress optimistically before server confirmation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(PROGRESS_KEYS.byTask(leafTask.id), [existingEntry])
    queryClient.setQueryData(TASK_KEYS.detail(leafTask.id), leafTask)
    queryClient.setQueryData(TASK_KEYS.tree(leafTask.id), leafTask)

    const deferred = createDeferred<ProgressEntry>()
    vi.mocked(progressApi.addProgress).mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useAddProgress(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.mutate({
        taskId: leafTask.id,
        data: { value: 15, note: 'More reading', recordedAt: '2026-03-22' },
      })
    })

    await waitFor(() => {
      const optimisticEntries = queryClient.getQueryData<ProgressEntry[]>(PROGRESS_KEYS.byTask(leafTask.id))
      expect(optimisticEntries).toHaveLength(2)
      expect(optimisticEntries?.[1].isOptimistic).toBe(true)

      const optimisticTask = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(leafTask.id))
      expect(optimisticTask?.progress).toBe(35)
    })

    deferred.resolve({
      id: 'progress-2',
      taskId: leafTask.id,
      value: 15,
      note: 'More reading',
      recordedAt: '2026-03-22',
      createdAt: '2026-03-22T00:00:00.000Z',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const settledEntries = queryClient.getQueryData<ProgressEntry[]>(PROGRESS_KEYS.byTask(leafTask.id))
    expect(settledEntries?.[1].id).toBe('progress-2')
  })

  it('rolls back deleted progress when mutation fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(PROGRESS_KEYS.byTask(leafTask.id), [existingEntry])
    queryClient.setQueryData(TASK_KEYS.detail(leafTask.id), leafTask)
    queryClient.setQueryData(TASK_KEYS.tree(leafTask.id), leafTask)

    const deferred = createDeferred<never>()
    vi.mocked(progressApi.deleteProgress).mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useDeleteProgress(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.mutate(existingEntry.id)
    })

    await waitFor(() => {
      expect(queryClient.getQueryData(PROGRESS_KEYS.byTask(leafTask.id))).toEqual([])
      expect(queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(leafTask.id))?.progress).toBe(0)
    })

    deferred.reject(new Error('delete failed'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(queryClient.getQueryData(PROGRESS_KEYS.byTask(leafTask.id))).toEqual([existingEntry])
    expect(queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(leafTask.id))?.progress).toBe(20)
  })
})
