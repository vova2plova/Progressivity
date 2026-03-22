import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import {
  createOptimisticTask,
  insertChildIntoTree,
  insertTaskIntoList,
  patchTaskById,
  patchTaskList,
  removeTaskFromList,
  removeTaskFromTree,
  reorderTasks,
  replaceTaskInTree,
} from '../lib/task-cache'
import type { CreateTaskRequest, ReorderTaskRequest, TaskWithProgress, UUID, UpdateTaskRequest } from '../types'

export const TASK_KEYS = {
  all: ['tasks'] as const,
  root: () => [...TASK_KEYS.all, 'root'] as const,
  detail: (id: UUID) => [...TASK_KEYS.all, 'detail', id] as const,
  tree: (id: UUID) => [...TASK_KEYS.all, 'tree', id] as const,
  children: (id: UUID) => [...TASK_KEYS.all, 'children', id] as const,
}

interface CreateTaskContext {
  previousRoot?: TaskWithProgress[]
  previousChildren?: TaskWithProgress[]
  previousParentTree?: TaskWithProgress
  previousParentDetail?: TaskWithProgress
  tempId: UUID
  parentId?: UUID | null
}

interface UpdateTaskContext {
  previousRoot?: TaskWithProgress[]
  previousDetail?: TaskWithProgress
  previousTree?: TaskWithProgress
  previousChildren?: TaskWithProgress[]
  previousParentTree?: TaskWithProgress
  taskId: UUID
  parentId?: UUID | null
}

interface DeleteTaskContext {
  previousRoot?: TaskWithProgress[]
  previousDetail?: TaskWithProgress
  previousChildren?: TaskWithProgress[]
  previousParentTree?: TaskWithProgress
  previousParentDetail?: TaskWithProgress
  taskId: UUID
  parentId?: UUID | null
}

interface ReorderTaskContext {
  previousRoot?: TaskWithProgress[]
  previousChildren?: TaskWithProgress[]
  taskId: UUID
  parentId?: UUID | null
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

function toCreatedTaskSnapshot(task: Awaited<ReturnType<typeof tasksApi.createTask>>): TaskWithProgress {
  return {
    ...task,
    progress: 0,
    children: task.type === 'container' ? [] : undefined,
    totalChildren: task.type === 'container' ? 0 : undefined,
    completedChildren: task.type === 'container' ? 0 : undefined,
  }
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.createTask(data),
    onMutate: async (variables): Promise<CreateTaskContext> => {
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.root() })

      const parentId = variables.parentId ?? null
      if (parentId) {
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.children(parentId) })
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.tree(parentId) })
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.detail(parentId) })
      }

      const previousRoot = queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.root())
      const previousChildren = parentId
        ? queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.children(parentId))
        : undefined
      const previousParentTree = parentId
        ? queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.tree(parentId))
        : undefined
      const previousParentDetail = parentId
        ? queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(parentId))
        : undefined

      const tempId = `temp-task-${Date.now()}`
      const optimisticTask = createOptimisticTask({
        id: tempId,
        parentId,
        title: variables.title,
        description: variables.description ?? null,
        unit: variables.unit ?? null,
        targetValue: variables.targetValue ?? null,
        deadline: variables.deadline ?? null,
        position: parentId ? previousChildren?.length ?? 0 : previousRoot?.length ?? 0,
      })

      if (parentId) {
        queryClient.setQueryData(TASK_KEYS.children(parentId), (current?: TaskWithProgress[]) =>
          insertTaskIntoList(current, optimisticTask),
        )
        queryClient.setQueryData(TASK_KEYS.tree(parentId), (current?: TaskWithProgress) =>
          insertChildIntoTree(current, parentId, optimisticTask),
        )
        queryClient.setQueryData(TASK_KEYS.detail(parentId), (current?: TaskWithProgress) =>
          insertChildIntoTree(current, parentId, optimisticTask),
        )
      } else {
        queryClient.setQueryData(TASK_KEYS.root(), (current?: TaskWithProgress[]) =>
          insertTaskIntoList(current, optimisticTask),
        )
      }

      return { previousRoot, previousChildren, previousParentTree, previousParentDetail, tempId, parentId }
    },
    onError: (_error, _variables, context) => {
      if (!context) return

      queryClient.setQueryData(TASK_KEYS.root(), context.previousRoot)
      if (context.parentId) {
        queryClient.setQueryData(TASK_KEYS.children(context.parentId), context.previousChildren)
        queryClient.setQueryData(TASK_KEYS.tree(context.parentId), context.previousParentTree)
        queryClient.setQueryData(TASK_KEYS.detail(context.parentId), context.previousParentDetail)
      }
    },
    onSuccess: (createdTask, variables, context) => {
      if (!context) return

      const createdSnapshot = toCreatedTaskSnapshot(createdTask)

      if (variables.parentId) {
        queryClient.setQueryData(TASK_KEYS.children(variables.parentId), (current?: TaskWithProgress[]) =>
          current?.map((task) => (task.id === context.tempId ? createdSnapshot : task)),
        )
        queryClient.setQueryData(TASK_KEYS.tree(variables.parentId), (current?: TaskWithProgress) =>
          replaceTaskInTree(current, context.tempId, createdSnapshot),
        )
        queryClient.setQueryData(TASK_KEYS.detail(variables.parentId), (current?: TaskWithProgress) =>
          replaceTaskInTree(current, context.tempId, createdSnapshot),
        )
      } else {
        queryClient.setQueryData(TASK_KEYS.root(), (current?: TaskWithProgress[]) =>
          current?.map((task) => (task.id === context.tempId ? createdSnapshot : task)),
        )
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })

      if (variables.parentId) {
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.children(variables.parentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(variables.parentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.parentId) })
      }
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: UpdateTaskRequest }) => tasksApi.updateTask(id, data),
    onMutate: async ({ id, data }): Promise<UpdateTaskContext> => {
      const previousDetail = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(id))
      const previousTree = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.tree(id))
      const parentId = previousDetail?.parentId ?? previousTree?.parentId ?? null

      await queryClient.cancelQueries({ queryKey: TASK_KEYS.root() })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.detail(id) })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.tree(id) })

      if (parentId) {
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.children(parentId) })
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.tree(parentId) })
      }

      const previousRoot = queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.root())
      const previousChildren = parentId
        ? queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.children(parentId))
        : undefined
      const previousParentTree = parentId
        ? queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.tree(parentId))
        : undefined

      queryClient.setQueryData(TASK_KEYS.detail(id), (current?: TaskWithProgress) =>
        current ? { ...current, ...data, isOptimistic: true } : current,
      )
      queryClient.setQueryData(TASK_KEYS.tree(id), (current?: TaskWithProgress) =>
        current ? { ...current, ...data, isOptimistic: true } : current,
      )
      queryClient.setQueryData(TASK_KEYS.root(), (current?: TaskWithProgress[]) =>
        patchTaskList(current, id, (task) => ({ ...task, ...data, isOptimistic: true })),
      )

      if (parentId) {
        queryClient.setQueryData(TASK_KEYS.children(parentId), (current?: TaskWithProgress[]) =>
          patchTaskList(current, id, (task) => ({ ...task, ...data, isOptimistic: true })),
        )
        queryClient.setQueryData(TASK_KEYS.tree(parentId), (current?: TaskWithProgress) =>
          patchTaskById(current, id, (task) => ({ ...task, ...data, isOptimistic: true })),
        )
      }

      return { previousRoot, previousDetail, previousTree, previousChildren, previousParentTree, taskId: id, parentId }
    },
    onError: (_error, _variables, context) => {
      if (!context) return

      queryClient.setQueryData(TASK_KEYS.root(), context.previousRoot)
      queryClient.setQueryData(TASK_KEYS.detail(context.taskId), context.previousDetail)
      queryClient.setQueryData(TASK_KEYS.tree(context.taskId), context.previousTree)

      if (context.parentId) {
        queryClient.setQueryData(TASK_KEYS.children(context.parentId), context.previousChildren)
        queryClient.setQueryData(TASK_KEYS.tree(context.parentId), context.previousParentTree)
      }
    },
    onSuccess: (updatedTask, _variables, context) => {
      const previousChildren = context?.previousTree?.children
      const previousProgress = context?.previousDetail?.progress ?? context?.previousTree?.progress ?? 0
      const mergedTask: TaskWithProgress = {
        ...updatedTask,
        progress: previousProgress,
        children: previousChildren,
        totalChildren: context?.previousTree?.totalChildren,
        completedChildren: context?.previousTree?.completedChildren,
      }

      queryClient.setQueryData(TASK_KEYS.detail(updatedTask.id), mergedTask)
      queryClient.setQueryData(TASK_KEYS.tree(updatedTask.id), mergedTask)
      queryClient.setQueryData(TASK_KEYS.root(), (current?: TaskWithProgress[]) =>
        patchTaskList(current, updatedTask.id, (task) => ({ ...task, ...updatedTask, isOptimistic: false })),
      )

      if (updatedTask.parentId) {
        queryClient.setQueryData(TASK_KEYS.children(updatedTask.parentId), (current?: TaskWithProgress[]) =>
          patchTaskList(current, updatedTask.id, (task) => ({ ...task, ...updatedTask, isOptimistic: false })),
        )
        queryClient.setQueryData(TASK_KEYS.tree(updatedTask.parentId), (current?: TaskWithProgress) =>
          patchTaskById(current, updatedTask.id, (task) => ({ ...task, ...updatedTask, isOptimistic: false })),
        )
      }
    },
    onSettled: (_data, _error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(variables.id) })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })

      if (context?.parentId) {
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.children(context.parentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(context.parentId) })
      }
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: UUID) => tasksApi.deleteTask(id),
    onMutate: async (id): Promise<DeleteTaskContext> => {
      const previousDetail = queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(id))
      const parentId = previousDetail?.parentId ?? null

      await queryClient.cancelQueries({ queryKey: TASK_KEYS.root() })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.detail(id) })
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.tree(id) })

      if (parentId) {
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.children(parentId) })
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.tree(parentId) })
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.detail(parentId) })
      }

      const previousRoot = queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.root())
      const previousChildren = parentId
        ? queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.children(parentId))
        : undefined
      const previousParentTree = parentId
        ? queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.tree(parentId))
        : undefined
      const previousParentDetail = parentId
        ? queryClient.getQueryData<TaskWithProgress>(TASK_KEYS.detail(parentId))
        : undefined

      queryClient.setQueryData(TASK_KEYS.root(), (current?: TaskWithProgress[]) => removeTaskFromList(current, id))
      queryClient.removeQueries({ queryKey: TASK_KEYS.detail(id), exact: true })
      queryClient.removeQueries({ queryKey: TASK_KEYS.tree(id), exact: true })

      if (parentId) {
        queryClient.setQueryData(TASK_KEYS.children(parentId), (current?: TaskWithProgress[]) =>
          removeTaskFromList(current, id),
        )
        queryClient.setQueryData(TASK_KEYS.tree(parentId), (current?: TaskWithProgress) =>
          removeTaskFromTree(current, id),
        )
        queryClient.setQueryData(TASK_KEYS.detail(parentId), (current?: TaskWithProgress) =>
          removeTaskFromTree(current, id),
        )
      }

      return { previousRoot, previousDetail, previousChildren, previousParentTree, previousParentDetail, taskId: id, parentId }
    },
    onError: (_error, _id, context) => {
      if (!context) return

      queryClient.setQueryData(TASK_KEYS.root(), context.previousRoot)
      queryClient.setQueryData(TASK_KEYS.detail(context.taskId), context.previousDetail)
      if (context.previousDetail) {
        queryClient.setQueryData(TASK_KEYS.tree(context.taskId), context.previousDetail)
      }

      if (context.parentId) {
        queryClient.setQueryData(TASK_KEYS.children(context.parentId), context.previousChildren)
        queryClient.setQueryData(TASK_KEYS.tree(context.parentId), context.previousParentTree)
        queryClient.setQueryData(TASK_KEYS.detail(context.parentId), context.previousParentDetail)
      }
    },
    onSettled: (_data, _error, id, context) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
      queryClient.removeQueries({ queryKey: TASK_KEYS.detail(id), exact: true })
      queryClient.removeQueries({ queryKey: TASK_KEYS.tree(id), exact: true })

      if (context?.parentId) {
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.children(context.parentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(context.parentId) })
        queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(context.parentId) })
      }
    },
  })
}

export function useReorderTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: ReorderTaskRequest }) => tasksApi.reorderTask(id, data),
    onMutate: async ({ id, data }): Promise<ReorderTaskContext> => {
      const parentId = data.newParentId ?? null

      await queryClient.cancelQueries({ queryKey: TASK_KEYS.root() })
      if (parentId) {
        await queryClient.cancelQueries({ queryKey: TASK_KEYS.children(parentId) })
      }

      const previousRoot = queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.root())
      const previousChildren = parentId
        ? queryClient.getQueryData<TaskWithProgress[]>(TASK_KEYS.children(parentId))
        : undefined

      if (parentId) {
        queryClient.setQueryData(TASK_KEYS.children(parentId), (current?: TaskWithProgress[]) =>
          reorderTasks(current, id, data.newPosition),
        )
      } else {
        queryClient.setQueryData(TASK_KEYS.root(), (current?: TaskWithProgress[]) =>
          reorderTasks(current, id, data.newPosition),
        )
      }

      return { previousRoot, previousChildren, taskId: id, parentId }
    },
    onError: (_error, _variables, context) => {
      if (!context) return

      queryClient.setQueryData(TASK_KEYS.root(), context.previousRoot)
      if (context.parentId) {
        queryClient.setQueryData(TASK_KEYS.children(context.parentId), context.previousChildren)
      }
    },
    onSettled: (_data, _error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.root() })
      if (context?.parentId || variables.data.newParentId) {
        const targetParentId = context?.parentId ?? variables.data.newParentId
        if (targetParentId) {
          queryClient.invalidateQueries({ queryKey: TASK_KEYS.children(targetParentId) })
          queryClient.invalidateQueries({ queryKey: TASK_KEYS.tree(targetParentId) })
        }
      }
    },
  })
}
