import type {
  UUID,
  Task,
  TaskWithProgress,
  ProgressEntry,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateProgressRequest,
} from '../types';
import { TaskStatus, TaskType } from '../types';

export class MockStore {
  private tasks: Map<UUID, Task> = new Map();
  private progressEntries: Map<UUID, ProgressEntry> = new Map();
  private nextTaskId = 1;
  private nextProgressId = 1;

  constructor() {
    this.seed();
  }

  // --- Task CRUD ---
  createTask(data: CreateTaskRequest, userId: UUID): Task {
    const id = this.generateTaskId();
    const now = new Date().toISOString();
    const task: Task = {
      id,
      userId,
      parentId: data.parentId ?? null,
      title: data.title,
      description: data.description ?? null,
      status: TaskStatus.PENDING,
      type: data.parentId ? TaskType.LEAF : TaskType.CONTAINER, // simplified; real logic should check if it's container or leaf based on targetValue
      unit: data.unit ?? null,
      targetValue: data.targetValue ?? null,
      position: this.getNextPosition(data.parentId ?? null),
      deadline: data.deadline ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }

  getTask(id: UUID): Task | undefined {
    return this.tasks.get(id);
  }

  getTaskWithProgress(id: UUID): TaskWithProgress | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const progress = this.calculateTaskProgress(id);
    const children = this.getChildrenIds(id);
    return {
      ...task,
      progress: progress * 100, // convert to percentage
      completedChildren: children.filter(childId => {
        const child = this.tasks.get(childId);
        return child?.status === TaskStatus.COMPLETED;
      }).length,
      totalChildren: children.length,
      children: children.map(childId => this.getTaskWithProgress(childId)!),
    };
  }

  updateTask(id: UUID, data: UpdateTaskRequest): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: UUID): boolean {
    // cascade delete children
    const children = this.getChildrenIds(id);
    children.forEach(childId => this.deleteTask(childId));

    // delete progress entries for this task
    this.getProgressEntriesByTaskId(id).forEach(entry => {
      this.progressEntries.delete(entry.id);
    });

    return this.tasks.delete(id);
  }

  listRootTasks(userId: UUID): Task[] {
    return Array.from(this.tasks.values())
      .filter(task => task.userId === userId && task.parentId === null)
      .sort((a, b) => a.position - b.position);
  }

  listChildren(parentId: UUID | null): Task[] {
    return Array.from(this.tasks.values())
      .filter(task => task.parentId === parentId)
      .sort((a, b) => a.position - b.position);
  }

  getTaskTree(rootId: UUID): TaskWithProgress | undefined {
    return this.getTaskWithProgress(rootId);
  }

  reorderTask(taskId: UUID, newPosition: number, newParentId?: UUID | null): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const targetParentId = newParentId !== undefined ? newParentId : task.parentId;
    const siblings = this.listChildren(targetParentId).filter(t => t.id !== taskId);

    // update position of all siblings
    const updatedSiblings: Task[] = [];
    let pos = 0;
    for (let i = 0; i < siblings.length + 1; i++) {
      if (pos === newPosition) {
        pos++;
      }
      if (i < siblings.length) {
        const sib = siblings[i];
        if (sib.position !== pos) {
          updatedSiblings.push({ ...sib, position: pos, updatedAt: new Date().toISOString() });
        }
        pos++;
      }
    }

    // update task
    task.position = newPosition;
    task.parentId = targetParentId;
    task.updatedAt = new Date().toISOString();

    updatedSiblings.forEach(t => this.tasks.set(t.id, t));
    this.tasks.set(task.id, task);
    return true;
  }

  // --- Progress CRUD ---
  addProgress(taskId: UUID, data: CreateProgressRequest): ProgressEntry | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    // only leaf tasks can have progress (simplification)
    if (task.type === TaskType.CONTAINER) return undefined;

    const id = this.generateProgressId();
    const now = new Date().toISOString();
    const entry: ProgressEntry = {
      id,
      taskId,
      value: data.value,
      note: data.note ?? null,
      recordedAt: data.recordedAt ?? now,
      createdAt: now,
    };
    this.progressEntries.set(id, entry);
    return entry;
  }

  deleteProgress(id: UUID): boolean {
    return this.progressEntries.delete(id);
  }

  getProgressEntriesByTaskId(taskId: UUID): ProgressEntry[] {
    return Array.from(this.progressEntries.values())
      .filter(entry => entry.taskId === taskId)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }

  // --- Progress Calculation ---
  private calculateTaskProgress(taskId: UUID): number {
    const task = this.tasks.get(taskId);
    if (!task) return 0;

    // Leaf with target value
    if (task.targetValue !== null) {
      const total = this.getProgressEntriesByTaskId(taskId).reduce((sum, entry) => sum + entry.value, 0);
      return Math.min(total / task.targetValue, 1);
    }

    // Binary leaf (no target value)
    if (task.type === TaskType.LEAF) {
      return task.status === TaskStatus.COMPLETED ? 1 : 0;
    }

    // Container: average of children's progress
    const children = this.getChildrenIds(taskId);
    if (children.length === 0) return 0;

    const childProgresses = children.map(childId => this.calculateTaskProgress(childId));
    const sum = childProgresses.reduce((a, b) => a + b, 0);
    return sum / children.length;
  }

  // --- Helper methods ---
  private generateTaskId(): UUID {
    return `task-${this.nextTaskId++}`;
  }

  private generateProgressId(): UUID {
    return `progress-${this.nextProgressId++}`;
  }

  private getChildrenIds(parentId: UUID): UUID[] {
    return Array.from(this.tasks.values())
      .filter(task => task.parentId === parentId)
      .sort((a, b) => a.position - b.position)
      .map(task => task.id);
  }

  private getNextPosition(parentId: UUID | null): number {
    const siblings = Array.from(this.tasks.values()).filter(task => task.parentId === parentId);
    if (siblings.length === 0) return 0;
    return Math.max(...siblings.map(t => t.position)) + 1;
  }

  // --- Seed data ---
  private seed() {
    const userId = 'user-1';
    const now = new Date().toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Goal 1: Read 10 books (container)
    const goal1Id = this.generateTaskId();
    const goal1: Task = {
      id: goal1Id,
      userId,
      parentId: null,
      title: 'Прочитать 10 книг',
      description: 'Литературный вызов на год',
      status: TaskStatus.IN_PROGRESS,
      type: TaskType.CONTAINER,
      unit: null,
      targetValue: null,
      position: 0,
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: monthAgo,
      updatedAt: now,
    };
    this.tasks.set(goal1Id, goal1);

    // Sub-tasks: individual books (leaf with target pages)
    const books = [
      { title: 'Преступление и наказание', pages: 500 },
      { title: '1984', pages: 328 },
      { title: 'Мастер и Маргарита', pages: 480 },
      { title: 'Маленький принц', pages: 96 },
      { title: 'Гордость и предубеждение', pages: 432 },
    ];
    books.forEach((book, idx) => {
      const bookId = this.generateTaskId();
      const task: Task = {
        id: bookId,
        userId,
        parentId: goal1Id,
        title: book.title,
        description: `Прочитать ${book.pages} страниц`,
        status: idx < 2 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
        type: TaskType.LEAF,
        unit: 'pages',
        targetValue: book.pages,
        position: idx,
        deadline: null,
        createdAt: monthAgo,
        updatedAt: now,
      };
      this.tasks.set(bookId, task);

      // Add progress entries for completed books
      if (idx < 2) {
        this.addProgress(bookId, { value: book.pages, note: 'Прочитано полностью' });
      } else if (idx === 2) {
        // Partially read
        this.addProgress(bookId, { value: 120, note: 'Начал читать' });
        this.addProgress(bookId, { value: 80, note: 'Продолжение' });
      }
    });

    // Goal 2: Run 500 km (container)
    const goal2Id = this.generateTaskId();
    const goal2: Task = {
      id: goal2Id,
      userId,
      parentId: null,
      title: 'Пробежать 500 км',
      description: 'Годовая цель по бегу',
      status: TaskStatus.IN_PROGRESS,
      type: TaskType.CONTAINER,
      unit: null,
      targetValue: null,
      position: 1,
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: monthAgo,
      updatedAt: now,
    };
    this.tasks.set(goal2Id, goal2);

    // Monthly sub-tasks (leaf with target km)
    const months = [
      { month: 'Январь', km: 40 },
      { month: 'Февраль', km: 45 },
      { month: 'Март', km: 50 },
      { month: 'Апрель', km: 55 },
    ];
    months.forEach((m, idx) => {
      const monthId = this.generateTaskId();
      const task: Task = {
        id: monthId,
        userId,
        parentId: goal2Id,
        title: `${m.month} ${new Date().getFullYear()}`,
        description: `Пробежать ${m.km} км`,
        status: idx < 2 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
        type: TaskType.LEAF,
        unit: 'km',
        targetValue: m.km,
        position: idx,
        deadline: new Date(Date.now() + idx * 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: monthAgo,
        updatedAt: now,
      };
      this.tasks.set(monthId, task);

      // Add progress entries
      if (idx < 2) {
        this.addProgress(monthId, { value: m.km, note: 'Выполнено' });
      } else if (idx === 2) {
        this.addProgress(monthId, { value: 30, note: 'Тренировки' });
      }
    });

    // Binary task (no target value)
    const binaryId = this.generateTaskId();
    const binaryTask: Task = {
      id: binaryId,
      userId,
      parentId: null,
      title: 'Обновить резюме',
      description: 'Добавить последний опыт работы',
      status: TaskStatus.PENDING,
      type: TaskType.LEAF,
      unit: null,
      targetValue: null,
      position: 2,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: monthAgo,
      updatedAt: now,
    };
    this.tasks.set(binaryId, binaryTask);
  }
}