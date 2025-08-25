// API utility functions for frontend


// Base API configuration
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Create API error class
export class APIError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    
    // Handle different response types
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Handle API error responses
      const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
      const details = data?.error?.details || data?.details || null;
      
      // Log the full error for debugging
      console.error('API Error Response:', data);
      
      throw new APIError(message, response.status, details);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Network error - please check your connection', 0);
    }

    throw new APIError(error.message || 'An unexpected error occurred', 0);
  }
}

// Helper function to clean query parameters
function cleanQueryParams(params) {
  const cleaned = {};
  
  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined, null, empty string, or empty array values
    if (value === undefined || 
        value === null || 
        value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      return;
    }
    
    // Convert arrays to comma-separated strings
    if (Array.isArray(value)) {
      const filteredArray = value.filter(item => item !== null && item !== undefined && item !== '');
      if (filteredArray.length > 0) {
        cleaned[key] = filteredArray.join(',');
      }
    } else {
      cleaned[key] = value;
    }
  });
  
  return cleaned;
}

// Task API functions
export const tasksAPI = {
  // Get all tasks with optional filters
  async getTasks(filters = {}) {
    const cleanFilters = cleanQueryParams(filters);
    const queryString = Object.keys(cleanFilters).length > 0 
      ? '?' + new URLSearchParams(cleanFilters).toString()
      : '';
    
    const endpoint = `/tasks${queryString}`;
    return apiRequest(endpoint);
  },

  // Get a single task by ID  
  async getTask(id) {
    if (!id) throw new APIError('Task ID is required', 400);
    return apiRequest(`/tasks/${id}`);
  },

  // Create a new task
  async createTask(taskData) {
    if (!taskData || !taskData.title?.trim()) {
      throw new APIError('Task title is required', 400);
    }
    
    const cleanTaskData = {
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || null,
      tags: Array.isArray(taskData.tags) 
        ? taskData.tags.filter(tag => tag && tag.trim()).map(tag => tag.trim())
        : []
    };
    
    return apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(cleanTaskData)
    });
  },

  // Update an existing task
  async updateTask(id, updates) {
    if (!id) throw new APIError('Task ID is required', 400);
    if (!updates || Object.keys(updates).length === 0) {
      throw new APIError('At least one field must be updated', 400);
    }
    
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
    
    if (Object.keys(cleanUpdates).length === 0) {
      throw new APIError('No valid updates provided', 400);
    }
    
    return apiRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanUpdates)
    });
  },

  // Delete a task
  async deleteTask(id) {
    if (!id) throw new APIError('Task ID is required', 400);
    return apiRequest(`/tasks/${id}`, { method: 'DELETE' });
  },

  // Get task statistics - UPDATED ENDPOINT
  async getStats() {
    return apiRequest('/tasks/stats');
  },

  // Health check - UPDATED ENDPOINT
  async healthCheck() {
    return apiRequest('/');  // Now uses /api/ instead of /api/health
  }
};

// Helper functions for common patterns
export const apiHelpers = {
  // Build filter object from URL params or form state
  buildFilters(searchParams) {
    const filters = {};
    
    const status = searchParams.get('status');
    if (status && status.trim()) filters.status = status.trim();
    
    const priority = searchParams.get('priority');
    if (priority && priority.trim()) filters.priority = priority.trim();
    
    const tags = searchParams.get('tags');
    if (tags && tags.trim()) {
      filters.tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    
    const search = searchParams.get('search');
    if (search && search.trim()) filters.search = search.trim();
    
    const sortBy = searchParams.get('sortBy');
    if (sortBy && sortBy.trim()) filters.sortBy = sortBy.trim();
    
    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) filters.sortOrder = sortOrder;
    
    const overdue = searchParams.get('overdue');
    if (overdue === 'true') filters.overdue = true;
    // Note: we don't set overdue = false explicitly, we just omit it

    const limit = searchParams.get('limit');
    if (limit && !isNaN(limit)) filters.limit = Math.min(Math.max(parseInt(limit), 1), 100);

    const offset = searchParams.get('offset');
    if (offset && !isNaN(offset)) filters.offset = Math.max(parseInt(offset), 0);
    
    return filters;
  },

  // Convert filters to URL search params
  filtersToSearchParams(filters) {
    const cleanFilters = cleanQueryParams(filters);
    return new URLSearchParams(cleanFilters);
  },

  // Format error message for display
  formatErrorMessage(error) {
    if (error instanceof APIError) {
      // Handle validation errors specially
      if (error.details?.type === 'validation_error' && error.details?.errors) {
        const fieldErrors = error.details.errors.map(err => `${err.field}: ${err.message}`);
        return `Validation Error: ${fieldErrors.join(', ')}`;
      }
      
      if (error.details && Array.isArray(error.details)) {
        return error.details.map(detail => detail.message).join(', ');
      }
      
      return error.message;
    }
    
    return error.message || 'An unexpected error occurred';
  },

  // Retry logic for failed requests
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry client errors (4xx) except for 429 (rate limit)
        if (error instanceof APIError && 
            error.status >= 400 && 
            error.status < 500 && 
            error.status !== 429) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
};

// Request interceptors (for future use with auth)
export const requestInterceptors = {
  // Add auth token to requests
  addAuthToken: (token) => {
    // This would modify default headers
    console.log('Auth token interceptor not implemented yet');
  },

  // Add request ID for tracking
  addRequestId: () => {
    return Math.random().toString(36).substr(2, 9);
  }
};