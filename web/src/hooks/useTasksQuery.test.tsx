import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tasksApi } from '../api/tasks'
import type { TaskWithProgress } from '../types'
import { TASK_KEYS, useCreateTask, useUpdateTask } from './useTasksQuery'

vi.mock('../api/tasks', () => ({
  tasksApi: {
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getRootTasks: vi.fn(),
    getTask: vi.fn(),
    getTaskTree: vi.fn(),
    getChildren: vi.fn(),
    reorderTask: vi.fn(),
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

const rootTask: TaskWithProgress = {
  id: 'root-1',
  userId: 'user-1',
  parentId: null,
  title: 'Root task',
  description: null,
  status: 'in_progress',
  type: 'container',
  unit: null,
  targetValue: null,
  position: 0,
  deadline: null,
  createdAt: '2026-03-22T00:00:00.000Z',
  updatedAt: '2026-03-22T00:00:00.000Z',
  progress: 25,
  children: [],
  totalChildren: 0,
  completedChildren: 0,
}

describe('useTasksQuery optimistic updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds an optimistic root task and rolls back on failure', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(TASK_KEYS.root(), [rootTask])

    const deferred = createDeferred<never>()
    vi.mocked(tasksApi.createTask).mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.mutate({ title: 'New goal' })
    })

    await waitFor(() => {
      const optimisticTasks = queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.root())
      expect(optimisticTasks).toHaveLength(2)
      expect(optimisticTasks?.[1].title).toBe('New goal')
      expect(optimisticTasks?.[1].isOptimistic).toBe(true)
    })

    deferred.reject(new Error('boom'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(queryClient.getQueryData(TASK_KEYS.root())).toEqual([rootTask])
  })

  it('patches task detail optimistically before update success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const detailTask: TaskWithProgress = {
      ...rootTask,
      id: 'leaf-1',
      parentId: null,
      title: 'Read book',
      type: 'leaf',
      targetValue: 300,
      unit: 'pages',
      progress: 50,
    }
    queryClient.setQueryData(TASK_KEYS.detail(detailTask.id), detailTask)
    queryClient.setQueryData(TASK_KEYS.tree(detailTask.id), detailTask)
    queryClient.setQueryData(TASK_KEYS.root(), [detailTask])

    const deferred = createDeferred<typeof detailTask>()
    vi.mocked(tasksApi.updateTask).mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useUpdateTask(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.mutate({ id: detailTask.id, data: { title: 'Read 12 books' } })
    })

    await waitFor(() => {
      const optimisticDetail = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(detailTask.id))
      expect(optimisticDetail?.title).toBe('Read 12 books')
      expect(optimisticDetail?.isOptimistic).toBe(true)
    })

    deferred.resolve({
      ...detailTask,
      title: 'Read 12 books',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const settledDetail = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(detailTask.id))
    expect(settledDetail?.title).toBe('Read 12 books')
    expect(settledDetail?.isOptimistic).toBeFalsy()
  })
})
