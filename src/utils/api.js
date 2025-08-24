/**
 * API utility functions for frontend
 */

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

// Task API functions
export const tasksAPI = {
  // Get all tasks with optional filters
  async getTasks(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const queryString = params.toString();
    const endpoint = `/tasks${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(endpoint);
  },

  // Get a single task by ID
  async getTask(id) {
    return apiRequest(`/tasks/${id}`);
  },

  // Create a new task
  async createTask(taskData) {
    return apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  // Update an existing task
  async updateTask(id, updates) {
    return apiRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // Delete a task
  async deleteTask(id) {
    return apiRequest(`/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  // Get task statistics
  async getStats() {
    return apiRequest('/stats');
  },

  // Health check
  async healthCheck() {
    return apiRequest('/health');
  }
};

// Helper functions for common patterns
export const apiHelpers = {
  // Build filter object from URL params or form state
  buildFilters(searchParams) {
    const filters = {};
    
    const status = searchParams.get('status');
    if (status) filters.status = status;
    
    const priority = searchParams.get('priority');
    if (priority) filters.priority = priority;
    
    const tags = searchParams.get('tags');
    if (tags) filters.tags = tags.split(',');
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const sortBy = searchParams.get('sortBy');
    if (sortBy) filters.sortBy = sortBy;
    
    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder) filters.sortOrder = sortOrder;
    
    const overdue = searchParams.get('overdue');
    if (overdue === 'true') filters.overdue = true;

    const limit = searchParams.get('limit');
    if (limit) filters.limit = parseInt(limit);

    const offset = searchParams.get('offset');
    if (offset) filters.offset = parseInt(offset);
    
    return filters;
  },

  // Convert filters to URL search params
  filtersToSearchParams(filters) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else if (!Array.isArray(value)) {
          params.set(key, value.toString());
        }
      }
    });
    
    return params;
  },

  // Format error message for display
  formatErrorMessage(error) {
    if (error instanceof APIError) {
      if (error.details && Array.isArray(error.details)) {
        // Validation errors
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
        
        // Don't retry client errors (4xx)
        if (error instanceof APIError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying
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