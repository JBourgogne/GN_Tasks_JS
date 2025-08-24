import { useCallback, useEffect } from 'react';
import { useTaskState, useTaskDispatch, taskActions } from '../context/TaskContext.jsx';
import { useTasksApi } from './useApi.js';

/**
 * Main hook for task management - combines context state with API calls
 */
export function useTasks() {
  const state = useTaskState();
  const dispatch = useTaskDispatch();
  const api = useTasksApi();

  // Load tasks based on current filters
  const loadTasks = useCallback(async (overrideFilters = null) => {
    const filters = overrideFilters || state.filters;
    
    try {
      dispatch(taskActions.setLoading(true));
      
      const result = await api.fetchTasks(filters, {
        onError: (error) => {
          dispatch(taskActions.setError(`Failed to load tasks: ${error.message}`));
        }
      });

      if (result && result.success) {
        dispatch(taskActions.setTasks(result.data));
      }
    } catch (error) {
      // Error is already handled by the API hook
      console.error('Load tasks error:', error);
    }
  }, [state.filters, api, dispatch]);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const result = await api.fetchStats({
        showErrorToUser: false, // Don't show stats errors to user
        onError: (error) => {
          console.error('Failed to load stats:', error);
        }
      });

      if (result && result.success) {
        dispatch(taskActions.setStats(result.data.statistics));
      }
    } catch (error) {
      // Stats are nice-to-have, don't break the UI
      console.error('Stats error:', error);
    }
  }, [api, dispatch]);

  // Create a new task
  const createTask = useCallback(async (taskData) => {
    try {
      const result = await api.createTask(taskData, {
        onError: (error) => {
          dispatch(taskActions.setError(`Failed to create task: ${error.message}`));
        }
      });

      if (result && result.success) {
        // Optimistically add to state
        dispatch(taskActions.addTask(result.data.task));
        
        // Reload stats
        loadStats();
        
        return result.data.task;
      }
    } catch (error) {
      throw error; // Re-throw so caller can handle
    }
  }, [api, dispatch, loadStats]);

  // Update an existing task
  const updateTask = useCallback(async (id, updates) => {
    // Optimistic update
    const currentTask = state.tasks.find(task => task.id === id);
    if (currentTask) {
      const optimisticTask = { 
        ...currentTask, 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      dispatch(taskActions.updateTask(optimisticTask));
    }

    try {
      const result = await api.updateTask(id, updates, {
        onError: (error) => {
          // Revert optimistic update on error
          if (currentTask) {
            dispatch(taskActions.updateTask(currentTask));
          }
          dispatch(taskActions.setError(`Failed to update task: ${error.message}`));
        }
      });

      if (result && result.success) {
        // Update with server response
        dispatch(taskActions.updateTask(result.data.task));
        
        // Reload stats if status changed
        if (updates.status) {
          loadStats();
        }
        
        return result.data.task;
      }
    } catch (error) {
      throw error;
    }
  }, [state.tasks, api, dispatch, loadStats]);

  // Delete a task
  const deleteTask = useCallback(async (id) => {
    // Optimistic delete
    const taskToDelete = state.tasks.find(task => task.id === id);
    dispatch(taskActions.deleteTask(id));

    try {
      const result = await api.deleteTask(id, {
        onError: (error) => {
          // Revert optimistic delete on error
          if (taskToDelete) {
            dispatch(taskActions.addTask(taskToDelete));
          }
          dispatch(taskActions.setError(`Failed to delete task: ${error.message}`));
        }
      });

      if (result && result.success) {
        // Reload stats
        loadStats();
        
        return true;
      }
    } catch (error) {
      throw error;
    }
  }, [state.tasks, api, dispatch, loadStats]);

  // Update filters and reload tasks
  const updateFilters = useCallback(async (newFilters) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    dispatch(taskActions.setFilters(newFilters));
    
    // Load tasks with new filters
    await loadTasks(updatedFilters);
  }, [state.filters, dispatch, loadTasks]);

  // Update search and reload tasks (with debouncing)
  const updateSearch = useCallback(async (searchTerm) => {
    dispatch(taskActions.setSearch(searchTerm));
    
    // Debouncing will be handled by the component using this hook
    const updatedFilters = { ...state.filters, search: searchTerm };
    await loadTasks(updatedFilters);
  }, [state.filters, dispatch, loadTasks]);

  // Update sort and reload tasks
  const updateSort = useCallback(async (sortBy, sortOrder = 'asc') => {
    dispatch(taskActions.setSort(sortBy, sortOrder));
    
    const updatedFilters = { 
      ...state.filters, 
      sortBy, 
      sortOrder 
    };
    await loadTasks(updatedFilters);
  }, [state.filters, dispatch, loadTasks]);

  // Clear all filters
  const clearFilters = useCallback(async () => {
    const clearedFilters = {
      status: '',
      priority: '',
      tags: [],
      search: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      overdue: false
    };
    
    dispatch(taskActions.setFilters(clearedFilters));
    await loadTasks(clearedFilters);
  }, [dispatch, loadTasks]);

  // Select a task
  const selectTask = useCallback((task) => {
    dispatch(taskActions.setSelectedTask(task));
  }, [dispatch]);

  // Modal management
  const openModal = useCallback((type, data = null) => {
    dispatch(taskActions.setModal({
      isOpen: true,
      type,
      data
    }));
  }, [dispatch]);

  const closeModal = useCallback(() => {
    dispatch(taskActions.setModal({
      isOpen: false,
      type: null,
      data: null
    }));
  }, [dispatch]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch(taskActions.clearError());
  }, [dispatch]);

  // Auto-load tasks when filters change (except search)
  useEffect(() => {
    // Only auto-load if we don't have tasks yet, or if non-search filters changed
    const hasNonSearchFilters = state.filters.status || 
                               state.filters.priority || 
                               state.filters.tags.length > 0 ||
                               state.filters.overdue;

    if (state.tasks.length === 0 || hasNonSearchFilters) {
      loadTasks();
    }
  }, [
    state.filters.status,
    state.filters.priority,
    state.filters.tags,
    state.filters.overdue,
    state.filters.sortBy,
    state.filters.sortOrder
    // Note: search is excluded from deps to avoid auto-loading on every keystroke
  ]);

  // Auto-load stats periodically
  useEffect(() => {
    loadStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [loadStats]);

  return {
    // State
    tasks: state.tasks,
    stats: state.stats,
    loading: state.loading || api.loading,
    error: state.error || api.error,
    filters: state.filters,
    pagination: state.pagination,
    selectedTask: state.selectedTask,
    modal: state.modal,

    // Actions
    loadTasks,
    loadStats,
    createTask,
    updateTask,
    deleteTask,
    updateFilters,
    updateSearch,
    updateSort,
    clearFilters,
    selectTask,
    openModal,
    closeModal,
    clearError,

    // API utilities
    api
  };
}