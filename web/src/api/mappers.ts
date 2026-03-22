import type {
  CreateProgressRequest,
  CreateTaskRequest,
  ProgressEntry,
  Task,
  TaskStatus,
  TaskType,
  TaskWithProgress,
  UpdateTaskRequest,
  UUID,
} from '../types'
import { toApiDateTime } from '../lib/date'

interface ApiTask {
  id: UUID
  user_id: UUID
  parent_id?: UUID | null
  title: string
  description?: string | null
  status: TaskStatus
  type?: TaskType
  unit?: string | null
  target_value?: number | null
  position: number
  deadline?: string | null
  progress?: number
  current_value?: number
  completed_children?: number
  total_children?: number
  created_at: string
  updated_at: string
  children?: ApiTask[]
}

function resolveTaskProgress(task: ApiTask): number {
  const currentValue = task.current_value ?? 0
  const targetValue = task.target_value ?? 1

  if (typeof task.progress === 'number') {
    return task.progress
  }

  return (currentValue / targetValue) * 100
}

interface ApiProgressEntry {
  id: UUID
  task_id: UUID
  value: number
  note?: string | null
  recorded_at: string
  created_at: string
}

function inferTaskType(task: ApiTask): TaskType {
  if (task.type) {
    return task.type
  }

  return task.children && task.children.length > 0 ? 'container' : 'leaf'
}

export function mapApiTask(task: ApiTask): Task {
  return {
    id: task.id,
    userId: task.user_id,
    parentId: task.parent_id ?? null,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    type: inferTaskType(task),
    unit: task.unit ?? null,
    targetValue: task.target_value ?? null,
    position: task.position,
    deadline: task.deadline ?? null,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }
}

export function mapApiTaskWithProgress(task: ApiTask): TaskWithProgress {
  return {
    ...mapApiTask(task),
    progress: resolveTaskProgress(task),
    currentValue: task.current_value ?? 0,
    completedChildren: task.completed_children,
    totalChildren: task.total_children,
    children: task.children?.map(mapApiTaskWithProgress),
  }
}

export function mapTaskPayload(task: CreateTaskRequest | UpdateTaskRequest) {
  return {
    title: task.title,
    description: task.description ?? null,
    unit: task.unit ?? null,
    target_value: task.targetValue ?? null,
    deadline: task.deadline ?? null,
    status: 'status' in task ? task.status : undefined,
  }
}

export function mapApiProgressEntry(entry: ApiProgressEntry): ProgressEntry {
  return {
    id: entry.id,
    taskId: entry.task_id,
    value: entry.value,
    note: entry.note ?? null,
    recordedAt: entry.recorded_at,
    createdAt: entry.created_at,
  }
}

export function mapProgressPayload(entry: CreateProgressRequest) {
  return {
    value: entry.value,
    note: entry.note ?? null,
    recorded_at: toApiDateTime(entry.recordedAt),
  }
}
