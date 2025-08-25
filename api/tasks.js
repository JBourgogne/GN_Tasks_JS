// api/tasks.js - Complete Tasks API with Joi Validation
import { getTaskRepository } from './data/TaskRepository.js';
import { setCorsHeaders, handleCorsPrelight } from './middleware/cors.js';
import { logRequest, logResponse } from './middleware/logger.js';
import { handleAPIError, APIError } from './middleware/errorHandler.js';
import Joi from 'joi';

// Joi Validation Schemas
const taskSchemas = {
  // Create task schema
  create: Joi.object({
    title: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Title cannot be empty',
        'string.min': 'Title must be at least 1 character',
        'string.max': 'Title must be 100 characters or less',
        'any.required': 'Title is required'
      }),
    
    description: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description must be 500 characters or less'
      }),
    
    status: Joi.string()
      .valid('todo', 'in_progress', 'completed')
      .default('todo')
      .messages({
        'any.only': 'Status must be one of: todo, in_progress, completed'
      }),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .default('medium')
      .messages({
        'any.only': 'Priority must be one of: low, medium, high'
      }),
    
    dueDate: Joi.date()
      .iso()
      .min('now')
      .allow(null)
      .optional()
      .messages({
        'date.format': 'Due date must be a valid ISO date',
        'date.min': 'Due date cannot be in the past'
      }),
    
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(1)
          .max(50)
          .pattern(/^[a-zA-Z0-9\-_]+$/)
          .messages({
            'string.pattern.base': 'Tags can only contain letters, numbers, hyphens, and underscores'
          })
      )
      .max(10)
      .unique()
      .default([])
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'array.unique': 'Tags must be unique'
      })
  }),

  // Query parameter validation schema
  filters: Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'completed').messages({
      'any.only': 'Status filter must be one of: todo, in_progress, completed'
    }),
    
    priority: Joi.string().valid('low', 'medium', 'high').messages({
      'any.only': 'Priority filter must be one of: low, medium, high'
    }),
    
    tags: Joi.string().messages({
      'string.base': 'Tags filter must be a comma-separated string'
    }),
    
    search: Joi.string().max(200).messages({
      'string.max': 'Search query must be 200 characters or less'
    }),
    
    overdue: Joi.boolean().messages({
      'boolean.base': 'Overdue filter must be true or false'
    }),
    
    sortBy: Joi.string()
      .valid('title', 'status', 'priority', 'createdAt', 'updatedAt', 'dueDate')
      .default('updatedAt')
      .messages({
        'any.only': 'Sort field must be one of: title, status, priority, createdAt, updatedAt, dueDate'
      }),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
        'any.only': 'Sort order must be asc or desc'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.base': 'Offset must be a number',
        'number.integer': 'Offset must be an integer',
        'number.min': 'Offset cannot be negative'
      })
  })
};

// Validation middleware functions
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

  // Process special fields
  if (value.tags && typeof value.tags === 'string') {
    value.tags = value.tags.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
  }

  // Convert overdue string to boolean if needed
  if (typeof value.overdue === 'string') {
    value.overdue = value.overdue.toLowerCase() === 'true';
  }

  return value;
}

// Content-Type validation
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

// Request body parsing with error handling
function parseRequestBody(req) {
  // Vercel serverless functions automatically parse JSON, but let's be safe
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

// Main handler function
export default async function handler(req, res) {
  let requestId;
  
  try {
    // Handle CORS preflight requests
    if (handleCorsPrelight(req, res)) {
      return;
    }

    // Set CORS headers for all responses
    setCorsHeaders(res, req.headers.origin);

    // Log incoming request and generate request ID
    requestId = logRequest(req);

    // Validate content type for POST requests
    validateContentType(req);

    // Parse request body for POST requests
    if (req.method === 'POST') {
      req.body = parseRequestBody(req);
    }

    // Get repository instance
    const repository = getTaskRepository();

    // Route to appropriate handler based on HTTP method
    let statusCode = 200;
    let response;

    switch (req.method) {
      case 'GET':
        response = await handleGetTasks(req, repository);
        break;
        
      case 'POST':
        response = await handleCreateTask(req, repository);
        statusCode = 201;
        break;
        
      default:
        throw new APIError(`Method ${req.method} not allowed`, 405, {
          type: 'method_not_allowed',
          allowedMethods: ['GET', 'POST'],
          message: `The ${req.method} method is not supported for this endpoint`
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
        endpoint: '/api/tasks'
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

// GET /api/tasks - Fetch tasks with filtering, sorting, and pagination
async function handleGetTasks(req, repository) {
  try {
    // Validate and process query parameters
    const filters = validateTaskFilters(req);
    
    console.log(`[${req.requestId}] Fetching tasks with filters:`, filters);

    // Fetch tasks from repository
    const result = await repository.findAll(filters);
    
    // Enhance response with metadata
    const enhancedResponse = {
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
        ),
        currentPage: Math.floor(filters.offset / filters.limit) + 1,
        totalPages: Math.ceil(result.pagination.total / filters.limit)
      }
    };

    console.log(`[${req.requestId}] Successfully fetched ${result.tasks.length} tasks`);
    
    return enhancedResponse;
    
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error(`[${req.requestId}] Error fetching tasks:`, error);
    throw new APIError('Failed to fetch tasks', 500, {
      type: 'database_error',
      message: 'An error occurred while retrieving tasks from the database',
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// POST /api/tasks - Create a new task
async function handleCreateTask(req, repository) {
  try {
    // Validate request body against schema
    const validatedData = validateCreateTask(req);
    
    console.log(`[${req.requestId}] Creating task:`, {
      title: validatedData.title,
      status: validatedData.status,
      priority: validatedData.priority,
      tagCount: validatedData.tags?.length || 0
    });

    // Additional business logic validation
    await performBusinessValidation(validatedData, repository);
    
    // Create the task
    const newTask = await repository.create(validatedData);
    
    console.log(`[${req.requestId}] Successfully created task with ID: ${newTask.id}`);
    
    // Return success response
    return {
      task: newTask,
      message: 'Task created successfully',
      summary: {
        id: newTask.id,
        title: newTask.title,
        status: newTask.status,
        priority: newTask.priority,
        createdAt: newTask.createdAt
      }
    };
    
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error(`[${req.requestId}] Error creating task:`, error);
    throw new APIError('Failed to create task', 500, {
      type: 'database_error',
      message: 'An error occurred while saving the task to the database',
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Additional business logic validation
async function performBusinessValidation(taskData, repository) {
  // Example: Check for duplicate titles (if that's a business requirement)
  if (process.env.PREVENT_DUPLICATE_TITLES === 'true') {
    try {
      const existingTasks = await repository.findAll({ 
        search: taskData.title,
        limit: 1 
      });
      
      const duplicateTitle = existingTasks.tasks.find(
        task => task.title.toLowerCase() === taskData.title.toLowerCase()
      );
      
      if (duplicateTitle) {
        throw new APIError('Duplicate task title', 409, {
          type: 'business_rule_violation',
          message: 'A task with this title already exists',
          conflictingTask: {
            id: duplicateTitle.id,
            title: duplicateTitle.title,
            createdAt: duplicateTitle.createdAt
          }
        });
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // If we can't check for duplicates, log it but don't fail the request
      console.warn('Could not check for duplicate titles:', error.message);
    }
  }

  // Example: Validate due date is reasonable (not too far in the future)
  if (taskData.dueDate) {
    const dueDate = new Date(taskData.dueDate);
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5); // 5 years from now
    
    if (dueDate > maxFutureDate) {
      throw new APIError('Due date too far in future', 400, {
        type: 'business_rule_violation',
        message: 'Due date cannot be more than 5 years in the future',
        maxAllowedDate: maxFutureDate.toISOString()
      });
    }
  }

  // Example: Limit high priority tasks (business rule)
  if (taskData.priority === 'high') {
    try {
      const highPriorityTasks = await repository.findAll({ 
        priority: 'high',
        status: 'todo',
        limit: 100 
      });
      
      if (highPriorityTasks.tasks.length >= 10) {
        console.warn(`High priority task limit approaching: ${highPriorityTasks.tasks.length}/10`);
        // Could throw an error here if you want to enforce the limit
      }
    } catch (error) {
      console.warn('Could not check high priority task limit:', error.message);
    }
  }
}

// Health check for this specific endpoint
export async function healthCheck() {
  try {
    const repository = getTaskRepository();
    const stats = await repository.getStats();
    
    return {
      status: 'healthy',
      endpoint: '/api/tasks',
      database: {
        connected: true,
        taskCount: stats.total
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      endpoint: '/api/tasks',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}