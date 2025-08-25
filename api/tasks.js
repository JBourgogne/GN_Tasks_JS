// api/tasks.js - ALL task-related endpoints consolidated
import { getTaskRepository } from './data/TaskRepository.js';
import { setCorsHeaders, handleCorsPrelight } from './middleware/cors.js';
import { logRequest, logResponse } from './middleware/logger.js';
import { handleAPIError, APIError } from './middleware/errorHandler.js';
import Joi from 'joi';

// All your existing schemas here...
const taskSchemas = {
  create: Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(500).allow('').optional(),
    status: Joi.string().valid('todo', 'in_progress', 'completed').default('todo'),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    dueDate: Joi.date().iso().min('now').allow(null).optional(),
    tags: Joi.array().items(
      Joi.string().trim().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/)
    ).max(10).unique().default([])
  }),

  update: Joi.object({
    title: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(500).allow(''),
    status: Joi.string().valid('todo', 'in_progress', 'completed'),
    priority: Joi.string().valid('low', 'medium', 'high'),
    dueDate: Joi.date().iso().allow(null),
    tags: Joi.array().items(
      Joi.string().trim().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/)
    ).max(10).unique()
  }).min(1),

  filters: Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'completed').allow(''),
    priority: Joi.string().valid('low', 'medium', 'high').allow(''),
    tags: Joi.string().allow(''),
    search: Joi.string().max(200).allow(''),
    overdue: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false', ''),
      Joi.valid(null)
    ).default(false),
    sortBy: Joi.string().valid('title', 'status', 'priority', 'createdAt', 'updatedAt', 'dueDate').default('updatedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    limit: Joi.alternatives().try(
      Joi.number().integer().min(1).max(100),
      Joi.string().pattern(/^\d+$/).custom(value => parseInt(value))
    ).default(50),
    offset: Joi.alternatives().try(
      Joi.number().integer().min(0),
      Joi.string().pattern(/^\d+$/).custom(value => parseInt(value))
    ).default(0)
  }).options({ stripUnknown: true }),

  taskId: Joi.object({
    id: Joi.string().uuid({ version: ['uuidv4'] }).required()
  })
};

// Validation functions
function validateCreateTask(req) {
  const { error, value } = taskSchemas.create.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new APIError('Task validation failed', 400, {
      type: 'validation_error',
      errors: validationErrors
    });
  }

  return value;
}

function validateUpdateTask(req) {
  const { error, value } = taskSchemas.update.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new APIError('Task update validation failed', 400, {
      type: 'validation_error',
      errors: validationErrors
    });
  }

  return value;
}

function validateTaskFilters(req) {
  const { error, value } = taskSchemas.filters.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new APIError('Invalid query parameters', 400, {
      type: 'validation_error',
      errors: validationErrors
    });
  }

  // Clean up filters
  if (value.tags && typeof value.tags === 'string') {
    if (value.tags.trim() === '') {
      delete value.tags;
    } else {
      value.tags = value.tags.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
      if (value.tags.length === 0) delete value.tags;
    }
  }

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

  Object.keys(value).forEach(key => {
    if (value[key] === '') delete value[key];
  });

  return value;
}

// Main handler that routes to different operations
export default async function handler(req, res) {
  let requestId;
  
  try {
    if (handleCorsPrelight(req, res)) return;
    setCorsHeaders(res, req.headers.origin);
    requestId = logRequest(req);

    const repository = getTaskRepository();
    
    // Parse URL to determine if this is individual task operation
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Check if this is /api/tasks/[id] pattern
    const isIndividualTask = pathParts.length === 3 && pathParts[2] !== 'stats';
    const taskId = isIndividualTask ? pathParts[2] : null;

    // Route based on URL pattern and method
    let statusCode = 200;
    let response;

    if (url.pathname.endsWith('/stats')) {
      // GET /api/tasks/stats
      if (req.method !== 'GET') {
        throw new APIError(`Method ${req.method} not allowed for stats`, 405);
      }
      response = await handleGetStats(repository);
    } else if (isIndividualTask) {
      // Individual task operations: /api/tasks/[id]
      response = await handleIndividualTask(req, taskId, repository);
      if (req.method === 'POST') statusCode = 201;
    } else {
      // Collection operations: /api/tasks
      response = await handleTaskCollection(req, repository);
      if (req.method === 'POST') statusCode = 201;
    }

    logResponse(req, res, statusCode);
    res.status(statusCode).json({
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        endpoint: url.pathname
      }
    });

  } catch (error) {
    if (requestId) logResponse(req, res, error.statusCode || 500);
    handleAPIError(res, error, requestId);
  }
}

// Handler for task collection operations
async function handleTaskCollection(req, repository) {
  switch (req.method) {
    case 'GET':
      const filters = validateTaskFilters(req);
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
        }
      };

    case 'POST':
      const validatedData = validateCreateTask(req);
      const newTask = await repository.create(validatedData);
      return {
        task: newTask,
        message: 'Task created successfully'
      };

    default:
      throw new APIError(`Method ${req.method} not allowed`, 405, {
        allowedMethods: ['GET', 'POST']
      });
  }
}

// Handler for individual task operations
async function handleIndividualTask(req, taskId, repository) {
  // Validate task ID format
  const { error } = taskSchemas.taskId.validate({ id: taskId });
  if (error) {
    throw new APIError('Invalid task ID format', 400, {
      type: 'validation_error',
      errors: [{ field: 'id', message: 'Task ID must be a valid UUID' }]
    });
  }

  switch (req.method) {
    case 'GET':
      const task = await repository.findById(taskId);
      if (!task) {
        throw new APIError('Task not found', 404, {
          type: 'resource_not_found',
          resource: 'task',
          resourceId: taskId
        });
      }
      return { task };

    case 'PUT':
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
        message: 'Task updated successfully'
      };

    case 'DELETE':
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

    default:
      throw new APIError(`Method ${req.method} not allowed`, 405, {
        allowedMethods: ['GET', 'PUT', 'DELETE']
      });
  }
}

// Handler for stats endpoint
async function handleGetStats(repository) {
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