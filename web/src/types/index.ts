export type UUID = string

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overcompleted' | 'canceled'
export const TaskStatus = {
  PENDING: 'pending' as TaskStatus,
  IN_PROGRESS: 'in_progress' as TaskStatus,
  COMPLETED: 'completed' as TaskStatus,
  OVERCOMPLETED: 'overcompleted' as TaskStatus,
  CANCELED: 'canceled' as TaskStatus,
}

export type TaskType = 'container' | 'leaf'
export const TaskType = {
  CONTAINER: 'container' as TaskType,
  LEAF: 'leaf' as TaskType,
}

export interface User {
  id: UUID
  email: string
  username: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: UUID
  userId: UUID
  parentId: UUID | null
  title: string
  description: string | null
  status: TaskStatus
  type: TaskType
  unit: string | null // 'pages', 'km', 'hours', etc.
  targetValue: number | null // null for binary tasks
  position: number // ordering within parent
  deadline: string | null
  createdAt: string
  updatedAt: string
}

export interface ProgressEntry {
  id: UUID
  taskId: UUID
  value: number
  note: string | null
  recordedAt: string // when progress actually happened
  createdAt: string
  isOptimistic?: boolean
}

export interface TaskWithProgress extends Task {
  progress: number // may be negative or exceed 100 for overcompletion
  currentValue?: number // may be negative
  completedChildren?: number
  totalChildren?: number
  children?: TaskWithProgress[] // for tree view
  isOptimistic?: boolean
}

// DTOs for API requests/responses
export interface CreateTaskRequest {
  title: string
  description?: string
  unit?: string
  targetValue?: number | null
  deadline?: string | null
  parentId?: UUID | null
}

export interface UpdateTaskRequest {
  title?: string
  description?: string | null
  status?: TaskStatus
  unit?: string | null
  targetValue?: number | null
  deadline?: string | null
}

export interface CreateProgressRequest {
  value: number
  note?: string
  recordedAt?: string
}

export interface ReorderTaskRequest {
  newPosition: number
  newParentId?: UUID | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

// Matches backend dto.AuthResponse (snake_case JSON)
export interface AuthResponse {
  access_token: string
  refresh_token: string
}

// Auth user info stored on the client (extracted from JWT + form data)
export interface AuthUser {
  id: UUID
  email: string
  username: string
}

export interface ErrorResponse {
  error: string
}
