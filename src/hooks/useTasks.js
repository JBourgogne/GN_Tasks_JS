// src/hooks/useTasks.js - Updated version with better delete handling
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTaskState, useTaskDispatch, taskActions } from '../context/TaskContext.jsx';
import { useTasksApi } from './useApi.js';

// Main hook for task management - with improved delete handling
export function useTasks() {
  const state = useTaskState();
  const dispatch = useTaskDispatch();
  const api = useTasksApi();
  
  // Local state to track if we've done initial load
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Use refs to prevent infinite loops and track operations
  const isLoadingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);

  // Helper function to clean filters
  const cleanFilters = useCallback((filters) => {
    if (!filters) return {};
    
    const cleaned = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'tags' && Array.isArray(value)) {
          const cleanTags = value.filter(tag => tag && tag.trim());
          if (cleanTags.length > 0) {
            cleaned[key] = cleanTags;
          }
        } else if (key === 'overdue') {
          if (value === true || value === 'true') {
            cleaned[key] = true;
          }
        } else if (key === 'search' && typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) {
            cleaned[key] = trimmed;
          }
        } else if (['status', 'priority', 'sortBy', 'sortOrder'].includes(key) && value) {
          cleaned[key] = value;
        }
      }
    });

    return cleaned;
  }, []);

  // Load tasks function - simplified
  const loadTasks = useCallback(async (filters = null) => {
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log('loadTasks: already loading, skipping');
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(taskActions.setLoading(true));
      
      const filtersToUse = filters || state.filters;
      const cleanedFilters = cleanFilters(filtersToUse);
      
      console.log('loadTasks: Loading with filters:', cleanedFilters);
      
      const result = await api.fetchTasks(cleanedFilters);

      if (result && result.success) {
        dispatch(taskActions.setTasks(result.data));
        console.log('loadTasks: Success, loaded', result.data.tasks?.length || 0, 'tasks');
      } else {
        console.error('loadTasks: API returned success=false');
        dispatch(taskActions.setError('Failed to load tasks'));
      }
      
      setHasInitiallyLoaded(true);
    } catch (error) {
      console.error('loadTasks: Error:', error);
      dispatch(taskActions.setError(`Failed to load tasks: ${error.message}`));
      setHasInitiallyLoaded(true);
    } finally {
      isLoadingRef.current = false;
      dispatch(taskActions.setLoading(false));
    }
  }, [api, dispatch, cleanFilters]);

  // Load statistics - simplified
  const loadStats = useCallback(async () => {
    try {
      console.log('loadStats: Loading statistics...');
      const result = await api.fetchStats();

      if (result && result.success) {
        dispatch(taskActions.setStats(result.data.statistics));
        console.log('loadStats: Success');
      } else {
        console.warn('loadStats: API returned success=false');
      }
    } catch (error) {
      console.error('loadStats: Error:', error);
      // Don't show user errors for stats failures
    }
  }, [api, dispatch]);

  // Create a new task
  const createTask = useCallback(async (taskData) => {
    try {
      console.log('createTask: Creating task:', taskData.title);
      
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

      const result = await api.createTask(cleanTaskData);

      if (result && result.success) {
        dispatch(taskActions.addTask(result.data.task));
        console.log('createTask: Success, created task:', result.data.task.id);
        
        // Refresh stats but don't wait for it
        loadStats().catch(console.error);
        
        return result.data.task;
      } else {
        throw new Error(result?.error?.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('createTask: Error:', error);
      dispatch(taskActions.setError(`Failed to create task: ${error.message}`));
      throw error;
    }
  }, [api, dispatch, loadStats]);

  // Update an existing task
  const updateTask = useCallback(async (id, updates) => {
    const currentTask = state.tasks.find(task => task.id === id);
    
    // Optimistic update
    if (currentTask) {
      const optimisticTask = { 
        ...currentTask, 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      dispatch(taskActions.updateTask(optimisticTask));
    }

    try {
      console.log('updateTask: Updating task:', id);
      
      const result = await api.updateTask(id, updates);

      if (result && result.success) {
        dispatch(taskActions.updateTask(result.data.task));
        console.log('updateTask: Success');
        
        // Refresh stats if status changed
        if (updates.status) {
          loadStats().catch(console.error);
        }
        
        return result.data.task;
      } else {
        throw new Error(result?.error?.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('updateTask: Error:', error);
      
      // Revert optimistic update
      if (currentTask) {
        dispatch(taskActions.updateTask(currentTask));
      }
      
      dispatch(taskActions.setError(`Failed to update task: ${error.message}`));
      throw error;
    }
  }, [state.tasks, api, dispatch, loadStats]);

  // Delete a task - IMPROVED VERSION
  const deleteTask = useCallback(async (id) => {
    console.log('deleteTask: Starting deletion for ID:', id, 'Type:', typeof id);
    
    const taskToDelete = state.tasks.find(task => task.id === id);
    if (!taskToDelete) {
      console.error('deleteTask: Task not found in local state:', id);
      const error = new Error('Task not found in local state. The task may have already been deleted.');
      dispatch(taskActions.setError(error.message));
      throw error;
    }
    
    console.log('deleteTask: Found task to delete:', taskToDelete.title);
    
    // Don't do optimistic delete for this operation to avoid sync issues
    // Let the server be the source of truth

    try {
      console.log('deleteTask: Calling API delete for task:', id);
      
      const result = await api.deleteTask(id);
      console.log('deleteTask: API response:', result);

      if (result && result.success) {
        // Only remove from local state after successful server deletion
        dispatch(taskActions.deleteTask(id));
        console.log('deleteTask: Successfully deleted task:', result.data.task.title);
        
        // Refresh stats
        loadStats().catch(console.error);
        
        return true;
      } else {
        console.error('deleteTask: API returned success=false:', result);
        throw new Error(result?.error?.message || 'Server returned failure response');
      }
    } catch (error) {
      console.error('deleteTask: Error during deletion:', error);
      
      // Check if it's a "not found" error - this might mean it was already deleted
      if (error.message && error.message.includes('Task not found')) {
        console.log('deleteTask: Task was already deleted on server, removing from local state');
        dispatch(taskActions.deleteTask(id));
        loadStats().catch(console.error);
        return true;
      }
      
      // For other errors, show user-friendly message
      let errorMessage = 'Failed to delete task';
      if (error.details?.debug?.message) {
        errorMessage += ': ' + error.details.debug.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      dispatch(taskActions.setError(errorMessage));
      throw error;
    }
  }, [state.tasks, api, dispatch, loadStats]);

  // Update filters - with debouncing to prevent rapid calls
  const updateFilters = useCallback(async (newFilters) => {
    console.log('updateFilters: New filters:', newFilters);
    
    // Clear any pending debounced call
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Update filters immediately in state
    dispatch(taskActions.setFilters(newFilters));
    
    // Debounce the API call
    debounceTimeoutRef.current = setTimeout(() => {
      const updatedFilters = { ...state.filters, ...newFilters };
      loadTasks(updatedFilters);
    }, 300);
  }, [dispatch, loadTasks]);

  // Update search - with debouncing
  const updateSearch = useCallback(async (searchTerm) => {
    const trimmedSearch = searchTerm?.trim() || '';
    console.log('updateSearch: Search term:', trimmedSearch);
    
    // Clear any pending debounced call
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Update search immediately in state
    dispatch(taskActions.setSearch(trimmedSearch));
    
    // Debounce the API call
    debounceTimeoutRef.current = setTimeout(() => {
      const updatedFilters = { ...state.filters, search: trimmedSearch };
      loadTasks(updatedFilters);
    }, 500); // Longer debounce for search
  }, [dispatch, loadTasks]);

  // Clear all filters
  const clearFilters = useCallback(async () => {
    console.log('clearFilters: Clearing all filters');
    
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
    
    // Load tasks with cleared filters
    setTimeout(() => {
      loadTasks(clearedFilters);
    }, 100);
  }, [dispatch, loadTasks]);

  // Select a task
  const selectTask = useCallback((task) => {
    dispatch(taskActions.setSelectedTask(task));
  }, [dispatch]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch(taskActions.clearError());
  }, [dispatch]);

  // Initial load effect - ONLY run once on mount
  useEffect(() => {
    if (!hasInitiallyLoaded && !isLoadingRef.current) {
      console.log('Initial load effect triggered');
      loadTasks();
    }
  }, [hasInitiallyLoaded, loadTasks]);

  // Stats load effect - run once and then periodically
  useEffect(() => {
    console.log('Stats load effect triggered');
    loadStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(() => {
      console.log('Periodic stats refresh');
      loadStats();
    }, 5 * 60 * 1000);
    
    return () => {
      console.log('Cleaning up stats interval');
      clearInterval(interval);
    };
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      console.log('Cleaning up debounce timeout');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    tasks: state.tasks,
    stats: state.stats,
    loading: state.loading,
    error: state.error,
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
    clearFilters,
    selectTask,
    clearError,

    // API utilities
    api
  };
}