import type { ProgressEntry, TaskWithProgress, TaskStatus, TaskType, UUID } from '../types'

export interface OptimisticTask extends TaskWithProgress {
  isOptimistic?: boolean
}

export interface OptimisticProgressEntry extends ProgressEntry {
  isOptimistic?: boolean
}

export function createOptimisticTask(input: {
  id: UUID
  userId?: UUID
  parentId?: UUID | null
  title: string
  description?: string | null
  unit?: string | null
  targetValue?: number | null
  deadline?: string | null
  position: number
}): OptimisticTask {
  const now = new Date().toISOString()
  const type: TaskType = input.parentId ? 'leaf' : 'container'

  return {
    id: input.id,
    userId: input.userId ?? 'optimistic-user',
    parentId: input.parentId ?? null,
    title: input.title,
    description: input.description ?? null,
    status: 'pending',
    type,
    unit: input.unit ?? null,
    targetValue: input.targetValue ?? null,
    position: input.position,
    deadline: input.deadline ?? null,
    createdAt: now,
    updatedAt: now,
    progress: 0,
    currentValue: 0,
    completedChildren: 0,
    totalChildren: type === 'container' ? 0 : undefined,
    children: type === 'container' ? [] : undefined,
    isOptimistic: true,
  }
}

export function createOptimisticProgressEntry(input: {
  id: UUID
  taskId: UUID
  value: number
  note?: string
  recordedAt?: string
}): OptimisticProgressEntry {
  return {
    id: input.id,
    taskId: input.taskId,
    value: input.value,
    note: input.note ?? null,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isOptimistic: true,
  }
}

export function sortTasks(tasks: TaskWithProgress[]): TaskWithProgress[] {
  return [...tasks].sort((left, right) => left.position - right.position)
}

export function sortProgressEntries(entries: ProgressEntry[]): ProgressEntry[] {
  return [...entries].sort(
    (left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime(),
  )
}

export function replaceTaskById(
  tasks: TaskWithProgress[] | undefined,
  taskId: UUID,
  nextTask: TaskWithProgress,
): TaskWithProgress[] | undefined {
  if (!tasks) return tasks

  return tasks.map((task) =>
    task.id === taskId ? nextTask : replaceTaskNode(task, taskId, nextTask),
  )
}

function replaceTaskNode(
  task: TaskWithProgress,
  taskId: UUID,
  nextTask: TaskWithProgress,
): TaskWithProgress {
  if (task.id === taskId) {
    return nextTask
  }

  if (!task.children?.length) {
    return task
  }

  return {
    ...task,
    children: task.children.map((child) => replaceTaskNode(child, taskId, nextTask)),
  }
}

export function patchTaskById(
  task: TaskWithProgress | undefined,
  taskId: UUID,
  updater: (task: TaskWithProgress) => TaskWithProgress,
): TaskWithProgress | undefined {
  if (!task) return task
  if (task.id === taskId) return updater(task)
  if (!task.children?.length) return task

  return {
    ...task,
    children: task.children.map((child) => patchTaskById(child, taskId, updater) ?? child),
  }
}

export function patchTaskList(
  tasks: TaskWithProgress[] | undefined,
  taskId: UUID,
  updater: (task: TaskWithProgress) => TaskWithProgress,
): TaskWithProgress[] | undefined {
  if (!tasks) return tasks
  return tasks.map((task) => patchTaskById(task, taskId, updater) ?? task)
}

export function insertTaskIntoList(
  tasks: TaskWithProgress[] | undefined,
  task: TaskWithProgress,
): TaskWithProgress[] {
  return sortTasks([...(tasks ?? []), task])
}

export function removeTaskFromList(
  tasks: TaskWithProgress[] | undefined,
  taskId: UUID,
): TaskWithProgress[] | undefined {
  if (!tasks) return tasks
  return tasks.filter((task) => task.id !== taskId)
}

export function insertChildIntoTree(
  tree: TaskWithProgress | undefined,
  parentId: UUID,
  child: TaskWithProgress,
): TaskWithProgress | undefined {
  return patchTaskById(tree, parentId, (task) => ({
    ...task,
    totalChildren: (task.totalChildren ?? task.children?.length ?? 0) + 1,
    children: sortTasks([...(task.children ?? []), child]),
  }))
}

export function removeTaskFromTree(
  tree: TaskWithProgress | undefined,
  taskId: UUID,
): TaskWithProgress | undefined {
  if (!tree) return tree

  if (tree.id === taskId) {
    return undefined
  }

  if (!tree.children?.length) {
    return tree
  }

  const hadDirectChild = tree.children.some((child) => child.id === taskId)
  const nextChildren = tree.children
    .filter((child) => child.id !== taskId)
    .map((child) => removeTaskFromTree(child, taskId))
    .filter((child): child is TaskWithProgress => Boolean(child))

  return {
    ...tree,
    totalChildren: hadDirectChild
      ? Math.max((tree.totalChildren ?? tree.children.length) - 1, 0)
      : tree.totalChildren,
    children: nextChildren,
  }
}

export function updateProgressSnapshot(
  task: TaskWithProgress | undefined,
  deltaValue: number,
): TaskWithProgress | undefined {
  if (!task || task.type !== 'leaf') {
    return task
  }

  const targetValue = task.targetValue && task.targetValue > 0 ? task.targetValue : 1
  const baseCurrentValue =
    typeof task.currentValue === 'number' ? task.currentValue : (task.progress / 100) * targetValue
  const nextCurrentValue = baseCurrentValue + deltaValue
  const nextProgress = (nextCurrentValue / targetValue) * 100
  const nextStatus: TaskStatus =
    nextProgress > 100
      ? 'overcompleted'
      : nextProgress >= 100
        ? 'completed'
        : nextProgress > 0
          ? 'in_progress'
          : task.status

  return {
    ...task,
    currentValue: nextCurrentValue,
    progress: nextProgress,
    status: nextStatus,
  }
}

export function replaceProgressEntry(
  entries: ProgressEntry[] | undefined,
  tempId: UUID,
  entry: ProgressEntry,
): ProgressEntry[] | undefined {
  if (!entries) return entries
  return sortProgressEntries(entries.map((current) => (current.id === tempId ? entry : current)))
}

export function removeProgressEntry(
  entries: ProgressEntry[] | undefined,
  entryId: UUID,
): ProgressEntry[] | undefined {
  if (!entries) return entries
  return entries.filter((entry) => entry.id !== entryId)
}

export function replaceTaskInTree(
  tree: TaskWithProgress | undefined,
  taskId: UUID,
  nextTask: TaskWithProgress,
): TaskWithProgress | undefined {
  return patchTaskById(tree, taskId, () => nextTask)
}

export function reorderTasks(
  tasks: TaskWithProgress[] | undefined,
  taskId: UUID,
  newPosition: number,
): TaskWithProgress[] | undefined {
  if (!tasks) return tasks

  const currentIndex = tasks.findIndex((task) => task.id === taskId)
  if (currentIndex === -1) return tasks

  const nextTasks = [...tasks]
  const [moved] = nextTasks.splice(currentIndex, 1)
  nextTasks.splice(Math.max(0, Math.min(newPosition, nextTasks.length)), 0, moved)

  return nextTasks.map((task, index) => ({ ...task, position: index }))
}
