import { useState, useCallback, useRef } from 'react';
import { tasksAPI, apiHelpers } from '../utils/api.js';

/**
 * Generic API hook for handling async operations
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Execute an async API call
  const execute = useCallback(async (apiCall, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      showErrorToUser = true,
      retries = 0 
    } = options;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (retries > 0) {
        result = await apiHelpers.retryRequest(apiCall, retries);
      } else {
        result = await apiCall();
      }

      setLoading(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, don't update state
        return null;
      }

      const errorMessage = apiHelpers.formatErrorMessage(err);
      setError(showErrorToUser ? errorMessage : err);
      setLoading(false);
      
      if (onError) {
        onError(err);
      } else {
        console.error('API Error:', err);
      }
      
      throw err;
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cancel pending request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    cancel();
    abortControllerRef.current = null;
  }, [cancel]);

  return {
    loading,
    error,
    execute,
    clearError,
    cancel,
    cleanup
  };
}

/**
 * Specialized hook for task-related API calls
 */
export function useTasksApi() {
  const api = useApi();

  // Fetch tasks with filters
  const fetchTasks = useCallback(async (filters = {}, options = {}) => {
    return api.execute(
      () => tasksAPI.getTasks(filters),
      options
    );
  }, [api]);

  // Fetch single task
  const fetchTask = useCallback(async (id, options = {}) => {
    return api.execute(
      () => tasksAPI.getTask(id),
      options
    );
  }, [api]);

  // Create new task
  const createTask = useCallback(async (taskData, options = {}) => {
    return api.execute(
      () => tasksAPI.createTask(taskData),
      {
        retries: 1, // Retry create operations once
        ...options
      }
    );
  }, [api]);

  // Update existing task
  const updateTask = useCallback(async (id, updates, options = {}) => {
    return api.execute(
      () => tasksAPI.updateTask(id, updates),
      {
        retries: 1, // Retry update operations once
        ...options
      }
    );
  }, [api]);

  // Delete task
  const deleteTask = useCallback(async (id, options = {}) => {
    return api.execute(
      () => tasksAPI.deleteTask(id),
      options
    );
  }, [api]);

  // Fetch statistics
  const fetchStats = useCallback(async (options = {}) => {
    return api.execute(
      () => tasksAPI.getStats(),
      options
    );
  }, [api]);

  // Health check
  const healthCheck = useCallback(async (options = {}) => {
    return api.execute(
      () => tasksAPI.healthCheck(),
      options
    );
  }, [api]);

  return {
    ...api,
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    fetchStats,
    healthCheck
  };
}