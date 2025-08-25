// src/hooks/useTasks.js - Ultra-stable version to prevent infinite loops
import { useCallback, useEffect, useRef } from 'react';
import { useTaskState, useTaskDispatch, taskActions } from '../context/TaskContext.jsx';
import { useTasksApi } from './useApi.js';

export function useTasks() {
  const state = useTaskState();
  const dispatch = useTaskDispatch();
  const api = useTasksApi();
  
  // Use refs to prevent infinite loops and track state
  const isInitialized = useRef(false);
  const isLoadingTasks = useRef(false);
  const isLoadingStats = useRef(false);
  const lastFiltersRef = useRef(JSON.stringify(state.filters));
  const debounceTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Stable filter cleaner - no dependencies
  const cleanFilters = useCallback((filters) => {
    if (!filters) return {};
    
    const cleaned = {};
    
    if (filters.status && filters.status.trim()) cleaned.status = filters.status.trim();
    if (filters.priority && filters.priority.trim()) cleaned.priority = filters.priority.trim();
    if (filters.search && filters.search.trim()) cleaned.search = filters.search.trim();
    if (filters.sortBy) cleaned.sortBy = filters.sortBy;
    if (filters.sortOrder) cleaned.sortOrder = filters.sortOrder;
    if (filters.overdue === true) cleaned.overdue = true;
    
    if (Array.isArray(filters.tags) && filters.tags.length > 0) {
      const cleanTags = filters.tags.filter(tag => tag && tag.trim());
      if (cleanTags.length > 0) cleaned.tags = cleanTags;
    }

    return cleaned;
  }, []);

  // Stable loadTasks function with circuit breaker
  const loadTasks = useCallback(async (filtersOverride = null, force = false) => {
    // Circuit breaker - prevent excessive retries
    if (retryCountRef.current >= maxRetries && !force) {
      console.log('Max retries reached, stopping loadTasks');
      return;
    }

    // Prevent concurrent calls
    if (isLoadingTasks.current && !force) {
      console.log('loadTasks already running, skipping');
      return;
    }

    try {
      isLoadingTasks.current = true;
      dispatch(taskActions.setLoading(true));
      
      const filters = filtersOverride || state.filters;
      const cleanedFilters = cleanFilters(filters);
      
      console.log('Loading tasks with filters:', cleanedFilters);
      
      const result = await api.fetchTasks(cleanedFilters, {
        showErrorToUser: false,
        onError: (error) => {
          console.error('Load tasks failed:', error);
          retryCountRef.current += 1;
        }
      });

      if (result && result.success && result.data) {
        dispatch(taskActions.setTasks(result.data));
        retryCountRef.current = 0; // Reset retry count on success
      } else {
        console.warn('No data received from API');
        dispatch(taskActions.setLoading(false));
      }
    } catch (error) {
      console.error('LoadTasks error:', error);
      dispatch(taskActions.setError('Failed to load tasks. Please refresh the page.'));
      retryCountRef.current += 1;
    } finally {
      isLoadingTasks.current = false;
    }
  }, []); // NO dependencies to prevent infinite loops

  // Stable loadStats function with circuit breaker
  const loadStats = useCallback(async (force = false) => {
    // Don't load stats if already loading or if we've hit max retries
    if (isLoadingStats.current && !force) return;
    if (retryCountRef.current >= maxRetries && !force) return;

    try {
      isLoadingStats.current = true;
      
      const result = await api.fetchStats({
        showErrorToUser: false,
        onError: (error) => {
          console.error('Load stats failed:', error);
          // Don't retry stats as aggressively
        }
      });

      if (result && result.success && result.data && result.data.statistics) {
        dispatch(taskActions.setStats(result.data.statistics));
      }
    } catch (error) {
      console.error('LoadStats error:', error);
      // Don't show error to user for stats failures
    } finally {
      isLoadingStats.current = false;
    }
  }, []); // NO dependencies

  // Initialize data only once
  const initializeData = useCallback(async () => {
    if (isInitialized.current) return;
    
    console.log('Initializing app data...');
    isInitialized.current = true;
    
    // Load tasks first, then stats
    await loadTasks(null, true);
    setTimeout(() => loadStats(true), 1000); // Delay stats to prevent concurrent API calls
  }, []); // NO dependencies

  // Debounced filter update
  const updateFilters = useCallback(async (newFilters) => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Update filters immediately in state
    dispatch(taskActions.setFilters(newFilters));
    
    // Debounce the actual API call
    debounceTimeoutRef.current = setTimeout(async () => {
      const currentFiltersString = JSON.stringify({ ...state.filters, ...newFilters });
      
      // Only load if filters actually changed
      if (currentFiltersString !== lastFiltersRef.current) {
        lastFiltersRef.current = currentFiltersString;
        await loadTasks({ ...state.filters, ...newFilters }, true);
      }
    }, 500); // 500ms debounce
  }, []); // NO dependencies

  // Debounced search update
  const updateSearch = useCallback((searchTerm) => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const trimmedSearch = searchTerm?.trim() || '';
    dispatch(taskActions.setSearch(trimmedSearch));
    
    // Debounce the actual API call
    debounceTimeoutRef.current = setTimeout(async () => {
      await loadTasks({ ...state.filters, search: trimmedSearch }, true);
    }, 800); // Longer debounce for search
  }, []); // NO dependencies

  // Simple task operations
  const createTask = useCallback(async (taskData) => {
    try {
      const cleanTaskData = {
        title: taskData.title?.trim() || '',
        description: taskData.description?.trim() || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        dueDate: taskData.dueDate || null,
        tags: Array.isArray(taskData.tags) 
          ? taskData.tags.filter(tag => tag && tag.trim()).map(tag => tag.trim())
          : []
      };

      if (!cleanTaskData.title) {
        throw new Error('Title is required');
      }

      const result = await api.createTask(cleanTaskData);

      if (result && result.success && result.data && result.data.task) {
        dispatch(taskActions.addTask(result.data.task));
        // Refresh stats after a delay
        setTimeout(() => loadStats(true), 500);
        return result.data.task;
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      dispatch(taskActions.setError(`Failed to create task: ${error.message}`));
      throw error;
    }
  }, []); // NO dependencies

  const updateTask = useCallback(async (id, updates) => {
    try {
      const result = await api.updateTask(id, updates);
      
      if (result && result.success && result.data && result.data.task) {
        dispatch(taskActions.updateTask(result.data.task));
        
        // Only refresh stats if status changed
        if (updates.status) {
          setTimeout(() => loadStats(true), 500);
        }
        
        return result.data.task;
      }
    } catch (error) {
      dispatch(taskActions.setError(`Failed to update task: ${error.message}`));
      throw error;
    }
  }, []); // NO dependencies

  const deleteTask = useCallback(async (id) => {
    try {
      const result = await api.deleteTask(id);
      
      if (result && result.success) {
        dispatch(taskActions.deleteTask(id));
        setTimeout(() => loadStats(true), 500);
        return true;
      }
    } catch (error) {
      dispatch(taskActions.setError(`Failed to delete task: ${error.message}`));
      throw error;
    }
  }, []); // NO dependencies

  // Simple utility functions
  const selectTask = useCallback((task) => {
    dispatch(taskActions.setSelectedTask(task));
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(taskActions.clearError());
    retryCountRef.current = 0; // Reset retry count when user clears error
  }, [dispatch]);

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
    await loadTasks(clearedFilters, true);
  }, []); // NO dependencies

  // Initialize only once on mount
  useEffect(() => {
    initializeData();
    
    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - run only once

  // Periodic stats refresh - much less aggressive
  useEffect(() => {
    // Only set up interval if initialization is complete
    if (!isInitialized.current) return;
    
    const interval = setInterval(() => {
      if (!isLoadingStats.current && retryCountRef.current < maxRetries) {
        loadStats(true);
      }
    }, 30000); // 30 seconds instead of 5 minutes to see changes faster, but not too aggressive
    
    return () => clearInterval(interval);
  }, []); // Empty dependency array

  return {
    // State
    tasks: state.tasks || [],
    stats: state.stats,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    selectedTask: state.selectedTask,

    // Actions
    loadTasks: (filters, force) => loadTasks(filters, force),
    loadStats: (force) => loadStats(force),
    createTask,
    updateTask,
    deleteTask,
    updateFilters,
    updateSearch,
    selectTask,
    clearError,
    clearFilters,

    // Utility
    api
  };
}