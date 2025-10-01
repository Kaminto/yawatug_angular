import { useState, useEffect, useCallback } from 'react';

interface LoadingTask {
  id: string;
  priority: number;
  loadFn: () => Promise<any>;
  dependencies?: string[];
}

interface UseProgressiveLoadingReturn {
  loadingStates: Record<string, boolean>;
  errors: Record<string, string | null>;
  data: Record<string, any>;
  addTask: (task: LoadingTask) => void;
  retryTask: (taskId: string) => void;
  isAllComplete: boolean;
}

export const useProgressiveLoading = (): UseProgressiveLoadingReturn => {
  const [tasks, setTasks] = useState<LoadingTask[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [data, setData] = useState<Record<string, any>>({});
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const addTask = useCallback((task: LoadingTask) => {
    setTasks(prev => [...prev.filter(t => t.id !== task.id), task].sort((a, b) => a.priority - b.priority));
    setLoadingStates(prev => ({ ...prev, [task.id]: false }));
    setErrors(prev => ({ ...prev, [task.id]: null }));
  }, []);

  const executeTask = useCallback(async (task: LoadingTask) => {
    // Check if dependencies are met
    if (task.dependencies?.some(dep => !completedTasks.has(dep))) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, [task.id]: true }));
    setErrors(prev => ({ ...prev, [task.id]: null }));

    try {
      const result = await task.loadFn();
      setData(prev => ({ ...prev, [task.id]: result }));
      setCompletedTasks(prev => new Set([...prev, task.id]));
    } catch (error: any) {
      setErrors(prev => ({ ...prev, [task.id]: error.message || 'Failed to load' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [task.id]: false }));
    }
  }, [completedTasks]);

  const retryTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      executeTask(task);
    }
  }, [tasks, executeTask]);

  useEffect(() => {
    const pendingTasks = tasks.filter(task => 
      !completedTasks.has(task.id) && 
      !loadingStates[task.id] && 
      !errors[task.id] &&
      (!task.dependencies || task.dependencies.every(dep => completedTasks.has(dep)))
    );

    pendingTasks.forEach(task => {
      executeTask(task);
    });
  }, [tasks, completedTasks, loadingStates, errors, executeTask]);

  const isAllComplete = tasks.length > 0 && tasks.every(task => 
    completedTasks.has(task.id) || errors[task.id]
  );

  return {
    loadingStates,
    errors,
    data,
    addTask,
    retryTask,
    isAllComplete
  };
};