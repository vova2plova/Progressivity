import { createContext, useContext, useCallback, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import { MockStore } from './mock-store';
import type {
  UUID,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateProgressRequest,
} from '../types';

interface StoreContextValue {
  store: MockStore;
  refresh: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new MockStore());
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const refresh = useCallback(() => {
    forceUpdate();
  }, []);

  const contextValue: StoreContextValue = {
    store,
    refresh,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}

// Convenience hooks for common operations
export function useTasks() {
  const { store, refresh } = useStore();
  const userId = 'user-1'; // mock user ID

  const rootTasks = store.listRootTasks(userId);
  const getTask = useCallback((id: UUID) => store.getTask(id), [store]);
  const getTaskWithProgress = useCallback((id: UUID) => store.getTaskWithProgress(id), [store]);
  const getChildren = useCallback((parentId: UUID) => store.listChildren(parentId), [store]);
  const getTaskTree = useCallback((rootId: UUID) => store.getTaskTree(rootId), [store]);

  const createTask = useCallback((data: CreateTaskRequest) => {
    const task = store.createTask(data, userId);
    refresh();
    return task;
  }, [store, refresh]);

  const updateTask = useCallback((id: UUID, data: UpdateTaskRequest) => {
    const updated = store.updateTask(id, data);
    if (updated) refresh();
    return updated;
  }, [store, refresh]);

  const deleteTask = useCallback((id: UUID) => {
    const deleted = store.deleteTask(id);
    if (deleted) refresh();
    return deleted;
  }, [store, refresh]);

  const reorderTask = useCallback((taskId: UUID, newPosition: number, newParentId?: UUID | null) => {
    const success = store.reorderTask(taskId, newPosition, newParentId);
    if (success) refresh();
    return success;
  }, [store, refresh]);

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
  };
}

export function useProgress() {
  const { store, refresh } = useStore();

  const getProgressEntries = useCallback((taskId: UUID) => store.getProgressEntriesByTaskId(taskId), [store]);

  const addProgress = useCallback((taskId: UUID, data: CreateProgressRequest) => {
    const entry = store.addProgress(taskId, data);
    if (entry) refresh();
    return entry;
  }, [store, refresh]);

  const deleteProgress = useCallback((id: UUID) => {
    const deleted = store.deleteProgress(id);
    if (deleted) refresh();
    return deleted;
  }, [store, refresh]);

  return {
    getProgressEntries,
    addProgress,
    deleteProgress,
  };
}