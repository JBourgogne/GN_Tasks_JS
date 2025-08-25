// api/index.js - Consolidated API handler for all endpoints
import { getTaskRepository } from './data/TaskRepository.js';
import { setCorsHeaders, handleCorsPrelight } from './middleware/cors.js';
import { logRequest, logResponse } from './middleware/logger.js';
import { handleAPIError, APIError } from './middleware/errorHandler.js';
import Joi from 'joi';

// Validation schemas
const taskSchemas = {
  create: Joi.object({
    title: Joi.string().trim().min(1).max(100).required().messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title must be 100 characters or less',
      'any.required': 'Title is required'
    }),
    description: Joi.string().trim().max(500).allow('').optional().messages({
      'string.max': 'Description must be 500 characters or less'
    }),
    status: Joi.string().valid('todo', 'in_progress', 'completed').default('todo').messages({
      'any.only': 'Status must be one of: todo, in_progress, completed'
    }),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium').messages({
      'any.only': 'Priority must be one of: low, medium, high'
    }),
    dueDate: Joi.date().iso().min('now').allow(null).optional().messages({
      'date.format': 'Due date must be a valid ISO date',
      'date.min': 'Due date cannot be in the past'
    }),
    tags: Joi.array().items(
      Joi.string().trim().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/).messages({
        'string.pattern.base': 'Tags can only contain letters, numbers, hyphens, and underscores'
      })
    ).max(10).unique().default([]).messages({
      'array.max': 'Maximum 10 tags allowed',
      'array.unique': 'Tags must be unique'
    })
  }),

  update: Joi.object({
    title: Joi.string().trim().min(1).max(100).messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title must be 100 characters or less'
    }),
    description: Joi.string().trim().max(500).allow('').messages({
      'string.max': 'Description must be 500 characters or less'
    }),
    status: Joi.string().valid('todo', 'in_progress', 'completed').messages({
      'any.only': 'Status must be one of: todo, in_progress, completed'
    }),
    priority: Joi.string().valid('low', 'medium', 'high').messages({
      'any.only': 'Priority must be one of: low, medium, high'
    }),
    dueDate: Joi.date().iso().allow(null).messages({
      'date.format': 'Due date must be a valid ISO date'
    }),
    tags: Joi.array().items(
      Joi.string().trim().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/)
    ).max(10).unique().messages({
      'array.max': 'Maximum 10 tags allowed',
      'array.unique': 'Tags must be unique'
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  filters: Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'completed').allow('').messages({
      'any.only': 'Status filter must be one of: todo, in_progress, completed'
    }),
    priority: Joi.string().valid('low', 'medium', 'high').allow('').messages({
      'any.only': 'Priority filter must be one of: low, medium, high'
    }),
    tags: Joi.string().allow('').messages({
      'string.base': 'Tags filter must be a comma-separated string'
    }),
    search: Joi.string().max(200).allow('').messages({
      'string.max': 'Search query must be 200 characters or less'
    }),
    overdue: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false', ''),
      Joi.valid(null)
    ).default(false).messages({
      'alternatives.match': 'Overdue filter must be true, false, or empty'
    }),
    sortBy: Joi.string().valid('title', 'status', 'priority', 'createdAt', 'updatedAt', 'dueDate').default('updatedAt').messages({
      'any.only': 'Sort field must be one of: title, status, priority, createdAt, updatedAt, dueDate'
    }),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': 'Sort order must be asc or desc'
    }),
    limit: Joi.alternatives().try(
      Joi.number().integer().min(1).max(100),
      Joi.string().pattern(/^\d+$/).custom(value => {
        const num = parseInt(value);
        if (num < 1 || num > 100) throw new Error('Must be between 1 and 100');
        return num;
      })
    ).default(50).messages({
      'alternatives.match': 'Limit must be a number between 1 and 100'
    }),
    offset: Joi.alternatives().try(
      Joi.number().integer().min(0),
      Joi.string().pattern(/^\d+$/).custom(value => {
        const num = parseInt(value);
        if (num < 0) throw new Error('Cannot be negative');
        return num;
      })
    ).default(0).messages({
      'alternatives.match': 'Offset must be a non-negative number'
    })
  }).options({ stripUnknown: true })
};

// Utility functions
function validateCreateTask(req) {
  const { error, value } = taskSchemas.create.validate(req.body, {
    abortEarly: false, stripUnknown: true, convert: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
      type: detail.type
    }));

    throw new APIError('Task validation failed', 400, {
      type: 'validation_error',
      errors: validationErrors,
      summary: `${validationErrors.length} validation error${validationErrors.length > 1 ? 's' : ''} found`
    });
  }

  return value;
}

function validateUpdateTask(req) {
  const { error, value } = taskSchemas.update.validate(req.body, {
    abortEarly: false, stripUnknown: true, convert: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
      type: detail.type
    }));

    throw new APIError('Task update validation failed', 400, {
      type: 'validation_error',
      errors: validationErrors,
      summary: `${validationErrors.length} validation error${validationErrors.length > 1 ? 's' : ''} found`
    });
  }

  return value;
}

function validateTaskFilters(req) {
  const { error, value } = taskSchemas.filters.validate(req.query, {
    abortEarly: false, stripUnknown: true, convert: true, allowUnknown: false
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new APIError('Invalid query parameters', 400, {
      type: 'validation_error',
      errors: validationErrors,
      received: req.query
    });
  }

  // Process tags
  if (value.tags && typeof value.tags === 'string') {
    if (value.tags.trim() === '') {
      delete value.tags;
    } else {
      value.tags = value.tags.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
      if (value.tags.length === 0) {
        delete value.tags;
      }
    }
  }

  // Process overdue
  if (value.overdue !== undefined) {
    if (typeof value.overdue === 'string') {
      if (value.overdue === 'true') {
        value.overdue = true;
      } else {
        delete value.overdue;
      }
    } else if (value.overdue === false) {
      delete value.overdue;
    }
  }

  // Remove empty string filters
  Object.keys(value).forEach(key => {
    if (value[key] === '') {
      delete value[key];
    }
  });

  return value;
}

function validateContentType(req) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('application/json')) {
      throw new APIError('Invalid Content-Type', 400, {
        type: 'content_type_error',
        received: contentType,
        expected: 'application/json',
        message: 'Request body must be JSON with Content-Type: application/json header'
      });
    }
  }
}

function parseRequestBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      throw new APIError('Invalid JSON in request body', 400, {
        type: 'json_parse_error',
        message: 'Request body contains malformed JSON',
        details: error.message
      });
    }
  }
  
  return req.body || {};
}

// Route handlers
async function handleHealthCheck() {
  try {
    const repository = getTaskRepository();
    const stats = await repository.getStats();

    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        api: 'operational',
        middleware: 'operational',
        repository: 'operational'
      },
      database: {
        type: 'in-memory',
        status: 'connected',
        taskCount: stats.total,
        indexes: {
          status: 'active',
          priority: 'active',
          tags: 'active'
        }
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version
      }
    };

    return healthInfo;
  } catch (error) {
    throw new APIError('Health check failed', 500, {
      type: 'health_check_error',
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleTasksCollection(req, repository) {
  switch (req.method) {
    case 'GET':
      try {
        const filters = validateTaskFilters(req);
        console.log('Fetching tasks with filters:', filters);
        
        const result = await repository.findAll(filters);
        
        return {
          ...result,
          filters: {
            applied: filters,
            available: {
              status: ['todo', 'in_progress', 'completed'],
              priority: ['low', 'medium', 'high'],
              sortBy: ['title', 'status', 'priority', 'createdAt', 'updatedAt', 'dueDate'],
              sortOrder: ['asc', 'desc']
            }
          },
          summary: {
            totalTasks: result.pagination.total,
            filteredTasks: result.tasks.length,
            hasFilters: Object.keys(filters).some(key => 
              filters[key] !== undefined && 
              filters[key] !== '' && 
              (Array.isArray(filters[key]) ? filters[key].length > 0 : true)
            )
          }
        };
      } catch (error) {
        if (error instanceof APIError) throw error;
        console.error('Error fetching tasks:', error);
        throw new APIError('Failed to fetch tasks', 500, {
          type: 'database_error',
          originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

    case 'POST':
      try {
        const validatedData = validateCreateTask(req);
        console.log('Creating task:', { title: validatedData.title, status: validatedData.status });
        
        const newTask = await repository.create(validatedData);
        
        return {
          task: newTask,
          message: 'Task created successfully',
          summary: {
            id: newTask.id,
            title: newTask.title,
            status: newTask.status,
            priority: newTask.priority
          }
        };
      } catch (error) {
        if (error instanceof APIError) throw error;
        console.error('Error creating task:', error);
        throw new APIError('Failed to create task', 500, {
          type: 'database_error',
          originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

    default:
      throw new APIError(`Method ${req.method} not allowed`, 405, {
        allowedMethods: ['GET', 'POST']
      });
  }
}

async function handleIndividualTask(req, taskId, repository) {
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(taskId)) {
    throw new APIError('Invalid task ID format', 400, {
      type: 'validation_error',
      errors: [{ 
        field: 'id', 
        message: 'Task ID must be a valid UUID format',
        value: taskId
      }]
    });
  }

  switch (req.method) {
    case 'GET':
      try {
        const task = await repository.findById(taskId);
        if (!task) {
          throw new APIError('Task not found', 404, {
            type: 'resource_not_found',
            resource: 'task',
            resourceId: taskId
          });
        }
        
        return {
          task,
          summary: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            isOverdue: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
          }
        };
      } catch (error) {
        if (error instanceof APIError) throw error;
        console.error('Error fetching task:', error);
        throw new APIError('Failed to fetch task', 500);
      }

    case 'PUT':
      try {
        const validatedUpdates = validateUpdateTask(req);
        const updatedTask = await repository.update(taskId, validatedUpdates);
        
        if (!updatedTask) {
          throw new APIError('Task not found', 404, {
            type: 'resource_not_found',
            resource: 'task',
            resourceId: taskId
          });
        }
        
        return {
          task: updatedTask,
          message: 'Task updated successfully',
          summary: {
            id: updatedTask.id,
            title: updatedTask.title,
            updatedFields: Object.keys(validatedUpdates)
          }
        };
      } catch (error) {
        if (error instanceof APIError) throw error;
        console.error('Error updating task:', error);
        throw new APIError('Failed to update task', 500);
      }

    case 'DELETE':
      try {
        const deletedTask = await repository.delete(taskId);
        if (!deletedTask) {
          throw new APIError('Task not found', 404, {
            type: 'resource_not_found',
            resource: 'task',
            resourceId: taskId
          });
        }
        
        return {
          task: deletedTask,
          message: 'Task deleted successfully'
        };
      } catch (error) {
        if (error instanceof APIError) throw error;
        console.error('Error deleting task:', error);
        throw new APIError('Failed to delete task', 500);
      }

    default:
      throw new APIError(`Method ${req.method} not allowed`, 405, {
        allowedMethods: ['GET', 'PUT', 'DELETE']
      });
  }
}

async function handleGetStats(repository) {
  try {
    console.log('Fetching task statistics...');
    
    const stats = await repository.getStats();
    
    const enhancedStats = {
      ...stats,
      completion: {
        rate: stats.total > 0 ? Math.round((stats.byStatus.completed / stats.total) * 100) : 0,
        total: stats.byStatus.completed,
        remaining: stats.byStatus.todo + stats.byStatus.in_progress
      },
      productivity: {
        completedToday: stats.completedToday,
        overdueItems: stats.overdue,
        inProgressItems: stats.byStatus.in_progress
      }
    };

    return {
      statistics: enhancedStats,
      summary: generateSummary(enhancedStats)
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw new APIError('Failed to fetch statistics', 500, {
      type: 'database_error',
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function generateSummary(stats) {
  if (stats.total === 0) {
    return 'No tasks yet. Create your first task to get started!';
  }
  
  const messages = [];
  const completionRate = stats.completion.rate;
  
  if (completionRate >= 80) {
    messages.push('Great job! You\'re doing excellent work.');
  } else if (completionRate >= 60) {
    messages.push('Good progress! Keep up the momentum.');
  } else if (completionRate >= 40) {
    messages.push('You\'re making progress. Stay focused!');
  } else {
    messages.push('Time to tackle some tasks!');
  }
  
  if (stats.productivity.overdueItems > 0) {
    messages.push(`You have ${stats.productivity.overdueItems} overdue task${stats.productivity.overdueItems > 1 ? 's' : ''}.`);
  }
  
  if (stats.productivity.completedToday > 0) {
    messages.push(`You completed ${stats.productivity.completedToday} task${stats.productivity.completedToday > 1 ? 's' : ''} today!`);
  }
  
  return messages.join(' ');
}

// MAIN HANDLER
export default async function handler(req, res) {
  let requestId;
  
  try {
    // Handle CORS preflight
    if (handleCorsPrelight(req, res)) return;
    
    // Set CORS headers
    setCorsHeaders(res, req.headers.origin);
    
    // Log request
    requestId = logRequest(req);

    // Parse URL to determine routing - handle Vercel serverless function context
    let pathname;
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      pathname = url.pathname;
    } catch (error) {
      // Fallback for cases where URL parsing fails
      pathname = req.url || '/';
    }
    
    // Normalize pathname for Vercel serverless functions
    // In Vercel, the rewrite might strip /api from the path
    if (!pathname.startsWith('/api')) {
      pathname = '/api' + (pathname === '/' ? '' : pathname);
    }
    
    console.log('Request pathname:', pathname);
    console.log('Original req.url:', req.url);

    // Validate content type for POST/PUT requests
    validateContentType(req);

    // Parse request body for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      req.body = parseRequestBody(req);
    }

    const repository = getTaskRepository();
    let statusCode = 200;
    let response;

    // Route handling - be more flexible with health check endpoint
    if (pathname === '/api' || pathname === '/api/' || pathname === '/api/health') {
      // Health check endpoint - accept /api, /api/, or /api/health
      if (req.method !== 'GET') {
        throw new APIError(`Method ${req.method} not allowed for health check`, 405, {
          allowedMethods: ['GET']
        });
      }
      response = await handleHealthCheck();
      
    } else if (pathname === '/api/tasks/stats') {
      // Stats endpoint - handle before individual task routing
      if (req.method !== 'GET') {
        throw new APIError(`Method ${req.method} not allowed for stats`, 405, {
          allowedMethods: ['GET']
        });
      }
      response = await handleGetStats(repository);
      
    } else if (pathname === '/api/tasks') {
      // Task collection endpoints
      response = await handleTasksCollection(req, repository);
      if (req.method === 'POST') statusCode = 201;
      
    } else if (pathname.startsWith('/api/tasks/') && !pathname.endsWith('/stats')) {
      // Individual task endpoints
      const taskId = pathname.split('/api/tasks/')[1];
      if (!taskId || taskId.includes('/')) {
        throw new APIError('Invalid task endpoint', 404);
      }
      response = await handleIndividualTask(req, taskId, repository);
      
    } else {
      // Unknown endpoint
      throw new APIError(`Endpoint not found: ${pathname}`, 404, {
        type: 'endpoint_not_found',
        availableEndpoints: [
          'GET /api/',
          'GET /api/health',
          'GET /api/tasks',
          'POST /api/tasks', 
          'GET /api/tasks/{id}',
          'PUT /api/tasks/{id}',
          'DELETE /api/tasks/{id}',
          'GET /api/tasks/stats'
        ]
      });
    }

    // Log successful response
    logResponse(req, res, statusCode);

    // Send successful response
    res.status(statusCode).json({
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        endpoint: pathname
      }
    });

  } catch (error) {
    // Log error response
    if (requestId) {
      logResponse(req, res, error.statusCode || 500);
    }
    
    // Handle and send error response
    handleAPIError(res, error, requestId);
  }
}