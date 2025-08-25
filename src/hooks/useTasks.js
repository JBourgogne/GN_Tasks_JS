// src/hooks/useTasks.js - Fixed version that resolves loading state issues
import { useCallback, useEffect, useRef } from 'react';
import { useTaskState, useTaskDispatch, taskActions } from '../context/TaskContext.jsx';
import { useTasksApi } from './useApi.js';

// Main hook for task management - combines context state with API calls
export function useTasks() {
  const state = useTaskState();
  const dispatch = useTaskDispatch();
  const api = useTasksApi();
  
  // Use refs to track loading states and prevent infinite loops
  const isLoadingTasks = useRef(false);
  const loadTasksTimeoutRef = useRef(null);

  // Helper function to clean filters before sending to API
  const cleanFilters = useCallback((filters) => {
    const cleaned = {};
    
    // Only include non-empty, meaningful values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'tags' && Array.isArray(value)) {
          const cleanTags = value.filter(tag => tag && tag.trim());
          if (cleanTags.length > 0) {
            cleaned[key] = cleanTags;
          }
        } else if (key === 'overdue') {
          // Only include overdue if it's explicitly true
          if (value === true || value === 'true') {
            cleaned[key] = true;
          }
          // Don't include overdue: false - just omit it
        } else if (key === 'search' && typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) {
            cleaned[key] = trimmed;
          }
        } else if (['status', 'priority', 'sortBy', 'sortOrder'].includes(key)) {
          if (value && value.trim && value.trim()) {
            cleaned[key] = value.trim();
          } else if (typeof value !== 'string' && value) {
            cleaned[key] = value;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });

    return cleaned;
  }, []); // No dependencies needed for this pure function

  // Load tasks based on current filters
  const loadTasks = useCallback(async (overrideFilters = null, force = false) => {
    // Prevent concurrent loadTasks calls
    if (isLoadingTasks.current && !force) {
      console.log('loadTasks already running, skipping...');
      return;
    }

    try {
      isLoadingTasks.current = true;
      dispatch(taskActions.setLoading(true));
      
      const filtersToUse = overrideFilters || state.filters;
      const cleanedFilters = cleanFilters(filtersToUse);
      
      console.log('Loading tasks with cleaned filters:', cleanedFilters);
      
      const result = await api.fetchTasks(cleanedFilters, {
        onError: (error) => {
          console.error('Load tasks error:', error);
          dispatch(taskActions.setError(`Failed to load tasks: ${error.message}`));
        }
      });

      if (result && result.success) {
        dispatch(taskActions.setTasks(result.data));
      } else {
        // Ensure loading state is cleared even if API returns success: false
        dispatch(taskActions.setLoading(false));
      }
    } catch (error) {
      console.error('Load tasks error:', error);
      dispatch(taskActions.setLoading(false));
    } finally {
      isLoadingTasks.current = false;
    }
  }, [state.filters, api, dispatch, cleanFilters]);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const result = await api.fetchStats({
        showErrorToUser: false,
        onError: (error) => {
          console.error('Failed to load stats:', error);
        }
      });

      if (result && result.success) {
        dispatch(taskActions.setStats(result.data.statistics));
      }
    } catch (error) {
      console.error('Stats error:', error);
    }
  }, [api, dispatch]);

  // Create a new task
  const createTask = useCallback(async (taskData) => {
    try {
      // Clean task data before sending
      const cleanTaskData = {
        title: taskData.title?.trim(),
        description: taskData.description?.trim() || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        dueDate: taskData.dueDate || null,
        tags: Array.isArray(taskData.tags) 
          ? taskData.tags.filter(tag => tag && tag.trim()).map(tag => tag.trim())
          : []
      };

      const result = await api.createTask(cleanTaskData, {
        onError: (error) => {
          dispatch(taskActions.setError(`Failed to create task: ${error.message}`));
        }
      });

      if (result && result.success) {
        dispatch(taskActions.addTask(result.data.task));
        loadStats(); // Refresh stats
        return result.data.task;
      }
    } catch (error) {
      throw error;
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
      // Clean updates before sending
      const cleanUpdates = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'title' && typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) cleanUpdates[key] = trimmed;
          } else if (key === 'description' && typeof value === 'string') {
            cleanUpdates[key] = value.trim();
          } else if (key === 'tags' && Array.isArray(value)) {
            cleanUpdates[key] = value.filter(tag => tag && tag.trim()).map(tag => tag.trim());
          } else {
            cleanUpdates[key] = value;
          }
        }
      });

      const result = await api.updateTask(id, cleanUpdates, {
        onError: (error) => {
          // Revert optimistic update on error
          if (currentTask) {
            dispatch(taskActions.updateTask(currentTask));
          }
          dispatch(taskActions.setError(`Failed to update task: ${error.message}`));
        }
      });

      if (result && result.success) {
        dispatch(taskActions.updateTask(result.data.task));
        
        // Reload stats if status changed
        if (updates.status) {
          loadStats();
        }
        
        return result.data.task;
      }
    } catch (error) {
      // Revert optimistic update on error
      if (currentTask) {
        dispatch(taskActions.updateTask(currentTask));
      }
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
        loadStats(); // Refresh stats
        return true;
      }
    } catch (error) {
      // Revert optimistic delete on error
      if (taskToDelete) {
        dispatch(taskActions.addTask(taskToDelete));
      }
      throw error;
    }
  }, [state.tasks, api, dispatch, loadStats]);

  // Update filters and reload tasks
  const updateFilters = useCallback(async (newFilters) => {
    // Clean the new filters and merge with existing
    const cleanedNewFilters = cleanFilters(newFilters);
    const updatedFilters = { ...state.filters, ...cleanedNewFilters };
    
    dispatch(taskActions.setFilters(cleanedNewFilters));
    
    // Clear any pending timeout
    if (loadTasksTimeoutRef.current) {
      clearTimeout(loadTasksTimeoutRef.current);
    }
    
    // Debounce the loadTasks call to prevent rapid firing
    loadTasksTimeoutRef.current = setTimeout(() => {
      loadTasks(updatedFilters, true); // force = true to bypass concurrency check
    }, 100);
  }, [state.filters, dispatch, loadTasks, cleanFilters]);

  // Update search and reload tasks (with debouncing)
  const updateSearch = useCallback(async (searchTerm) => {
    const trimmedSearch = searchTerm?.trim() || '';
    
    dispatch(taskActions.setSearch(trimmedSearch));
    
    const updatedFilters = { 
      ...state.filters, 
      search: trimmedSearch 
    };
    
    // Clear any pending timeout
    if (loadTasksTimeoutRef.current) {
      clearTimeout(loadTasksTimeoutRef.current);
    }
    
    // Debounce the search
    loadTasksTimeoutRef.current = setTimeout(() => {
      loadTasks(updatedFilters, true);
    }, 300);
  }, [state.filters, dispatch, loadTasks]);

  // Update sort and reload tasks
  const updateSort = useCallback(async (sortBy, sortOrder = 'asc') => {
    dispatch(taskActions.setSort(sortBy, sortOrder));
    
    const updatedFilters = { 
      ...state.filters, 
      sortBy, 
      sortOrder 
    };
    
    await loadTasks(updatedFilters, true);
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
    
    // Load tasks with minimal filters (only the defaults that matter)
    await loadTasks({
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    }, true);
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

  // Initial load effect - only run once on mount if no tasks exist
  useEffect(() => {
    if (state.tasks.length === 0 && !isLoadingTasks.current) {
      console.log('Initial tasks load...');
      loadTasks(null, true);
    }
  }, []); // Empty dependency array - only run on mount

  // Auto-load stats periodically
  useEffect(() => {
    loadStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [loadStats]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadTasksTimeoutRef.current) {
        clearTimeout(loadTasksTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    tasks: state.tasks,
    stats: state.stats,
    loading: (state.loading || api.loading) && isLoadingTasks.current, // More refined loading state
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