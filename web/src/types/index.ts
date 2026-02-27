export type UUID = string;

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export const TaskStatus = {
  PENDING: 'pending' as TaskStatus,
  IN_PROGRESS: 'in_progress' as TaskStatus,
  COMPLETED: 'completed' as TaskStatus,
  CANCELLED: 'cancelled' as TaskStatus,
};

export type TaskType = 'container' | 'leaf';
export const TaskType = {
  CONTAINER: 'container' as TaskType,
  LEAF: 'leaf' as TaskType,
};

export interface User {
  id: UUID;
  email: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: UUID;
  userId: UUID;
  parentId: UUID | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  type: TaskType;
  unit: string | null; // 'pages', 'km', 'hours', etc.
  targetValue: number | null; // null for binary tasks
  position: number; // ordering within parent
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEntry {
  id: UUID;
  taskId: UUID;
  value: number;
  note: string | null;
  recordedAt: string; // when progress actually happened
  createdAt: string;
}

export interface TaskWithProgress extends Task {
  progress: number; // 0-100 percentage
  completedChildren?: number;
  totalChildren?: number;
  children?: TaskWithProgress[]; // for tree view
}

// DTOs for API requests/responses
export interface CreateTaskRequest {
  title: string;
  description?: string;
  unit?: string;
  targetValue?: number | null;
  deadline?: string | null;
  parentId?: UUID | null;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  unit?: string | null;
  targetValue?: number | null;
  deadline?: string | null;
}

export interface CreateProgressRequest {
  value: number;
  note?: string;
  recordedAt?: string;
}

export interface ReorderTaskRequest {
  newPosition: number;
  newParentId?: UUID | null;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
}