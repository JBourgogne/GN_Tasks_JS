// Individual Task Operations (GET, PUT, DELETE)
import { getTaskRepository } from '../data/TaskRepository.js';
import { setCorsHeaders, handleCorsPrelight } from '../middleware/cors.js';
import { logRequest, logResponse } from '../middleware/logger.js';
import { handleAPIError, APIError } from '../middleware/errorHandler.js';
import Joi from 'joi';

// Joi Validation Schemas
const taskSchemas = {
  // Task ID parameter validation
  taskId: Joi.object({
    id: Joi.string()
      .uuid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'Task ID must be a valid UUID',
        'any.required': 'Task ID is required',
        'string.empty': 'Task ID cannot be empty'
      })
  }),

  // Update task schema (all fields optional)
  update: Joi.object({
    title: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.empty': 'Title cannot be empty',
        'string.min': 'Title must be at least 1 character',
        'string.max': 'Title must be 100 characters or less'
      }),
    
    description: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Description must be 500 characters or less'
      }),
    
    status: Joi.string()
      .valid('todo', 'in_progress', 'completed')
      .messages({
        'any.only': 'Status must be one of: todo, in_progress, completed'
      }),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .messages({
        'any.only': 'Priority must be one of: low, medium, high'
      }),
    
    dueDate: Joi.date()
      .iso()
      .allow(null)
      .messages({
        'date.format': 'Due date must be a valid ISO date'
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
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'array.unique': 'Tags must be unique'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

// Validation middleware functions
function validateTaskId(req) {
  const { error, value } = taskSchemas.taskId.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new APIError('Invalid task ID', 400, {
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

// Content-Type validation
function validateContentType(req) {
  if (req.method === 'PUT') {
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

    // Extract and validate task ID from URL parameters
    const { id } = req.query;
    if (!id) {
      throw new APIError('Task ID is required', 400, {
        type: 'missing_parameter',
        parameter: 'id',
        message: 'Task ID must be provided in the URL path'
      });
    }

    // Validate task ID format
    validateTaskId({ query: { id } });

    // Validate content type for PUT requests
    validateContentType(req);

    // Parse request body for PUT requests
    if (req.method === 'PUT') {
      req.body = parseRequestBody(req);
    }

    // Get repository instance
    const repository = getTaskRepository();

    // Route to appropriate handler based on HTTP method
    let statusCode = 200;
    let response;

    switch (req.method) {
      case 'GET':
        response = await handleGetTask(req, id, repository);
        break;
        
      case 'PUT':
        response = await handleUpdateTask(req, id, repository);
        break;
        
      case 'DELETE':
        response = await handleDeleteTask(req, id, repository);
        break;
        
      default:
        throw new APIError(`Method ${req.method} not allowed`, 405, {
          type: 'method_not_allowed',
          allowedMethods: ['GET', 'PUT', 'DELETE'],
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
        endpoint: `/api/tasks/${id}`,
        taskId: id
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

// GET /api/tasks/[id] - Get a single task by ID
async function handleGetTask(req, id, repository) {
  try {
    console.log(`[${req.requestId}] Fetching task with ID: ${id}`);
    
    const task = await repository.findById(id);
    
    if (!task) {
      throw new APIError('Task not found', 404, {
        type: 'resource_not_found',
        resource: 'task',
        resourceId: id,
        message: `No task exists with ID: ${id}`
      });
    }
    
    console.log(`[${req.requestId}] Successfully found task: ${task.title}`);
    
    return {
      task,
      summary: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        isOverdue: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed',
        daysSinceCreated: Math.floor((new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24)),
        lastUpdated: task.updatedAt
      }
    };
    
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error(`[${req.requestId}] Error fetching task ${id}:`, error);
    throw new APIError('Failed to fetch task', 500, {
      type: 'database_error',
      message: 'An error occurred while retrieving the task from the database',
      taskId: id,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// PUT /api/tasks/[id] - Update an existing task
async function handleUpdateTask(req, id, repository) {
  try {
    // Validate request body against schema
    const validatedUpdates = validateUpdateTask(req);
    
    console.log(`[${req.requestId}] Updating task ${id} with:`, {
      fields: Object.keys(validatedUpdates),
      title: validatedUpdates.title ? '(updated)' : '(unchanged)',
      status: validatedUpdates.status || '(unchanged)',
      priority: validatedUpdates.priority || '(unchanged)'
    });

    // Get existing task first to validate it exists and for comparison
    const existingTask = await repository.findById(id);
    
    if (!existingTask) {
      throw new APIError('Task not found', 404, {
        type: 'resource_not_found',
        resource: 'task',
        resourceId: id,
        message: `No task exists with ID: ${id}`
      });
    }

    // Additional business logic validation for updates
    await performUpdateBusinessValidation(existingTask, validatedUpdates, repository);
    
    // Perform the update
    const updatedTask = await repository.update(id, validatedUpdates);
    
    if (!updatedTask) {
      // This shouldn't happen if we found the task above, but let's be safe
      throw new APIError('Task not found during update', 404, {
        type: 'concurrent_modification',
        message: 'The task may have been deleted by another process',
        taskId: id
      });
    }
    
    // Log the changes made
    const changes = getTaskChanges(existingTask, updatedTask);
    console.log(`[${req.requestId}] Successfully updated task ${id}. Changes:`, changes);
    
    return {
      task: updatedTask,
      message: 'Task updated successfully',
      changes: changes,
      summary: {
        id: updatedTask.id,
        title: updatedTask.title,
        previousStatus: existingTask.status,
        newStatus: updatedTask.status,
        updatedFields: Object.keys(validatedUpdates),
        lastUpdated: updatedTask.updatedAt
      }
    };
    
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error(`[${req.requestId}] Error updating task ${id}:`, error);
    throw new APIError('Failed to update task', 500, {
      type: 'database_error',
      message: 'An error occurred while updating the task in the database',
      taskId: id,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// DELETE /api/tasks/[id] - Delete a task
async function handleDeleteTask(req, id, repository) {
  try {
    console.log(`[${req.requestId}] Attempting to delete task: ${id}`);
    
    // Get the task first to return it in the response
    const taskToDelete = await repository.findById(id);
    
    if (!taskToDelete) {
      throw new APIError('Task not found', 404, {
        type: 'resource_not_found',
        resource: 'task',
        resourceId: id,
        message: `No task exists with ID: ${id}`
      });
    }

    // Additional business logic validation for deletion
    await performDeleteBusinessValidation(taskToDelete, repository);
    
    // Perform the deletion
    const deletedTask = await repository.delete(id);
    
    if (!deletedTask) {
      // This shouldn't happen if we found the task above, but let's be safe
      throw new APIError('Task not found during deletion', 404, {
        type: 'concurrent_modification',
        message: 'The task may have been deleted by another process',
        taskId: id
      });
    }
    
    console.log(`[${req.requestId}] Successfully deleted task: ${deletedTask.title}`);
    
    return {
      task: deletedTask,
      message: 'Task deleted successfully',
      summary: {
        id: deletedTask.id,
        title: deletedTask.title,
        status: deletedTask.status,
        deletedAt: new Date().toISOString(),
        existed: {
          days: Math.floor((new Date() - new Date(deletedTask.createdAt)) / (1000 * 60 * 60 * 24)),
          lastUpdated: deletedTask.updatedAt
        }
      }
    };
    
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error(`[${req.requestId}] Error deleting task ${id}:`, error);
    throw new APIError('Failed to delete task', 500, {
      type: 'database_error',
      message: 'An error occurred while deleting the task from the database',
      taskId: id,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Business validation for task updates
async function performUpdateBusinessValidation(existingTask, updates, repository) {
  // Prevent updating completed tasks if they were completed more than 24 hours ago
  if (existingTask.status === 'completed' && updates.status && updates.status !== 'completed') {
    const completedTime = new Date(existingTask.updatedAt);
    const now = new Date();
    const hoursSinceCompletion = (now - completedTime) / (1000 * 60 * 60);
    
    if (hoursSinceCompletion > 24) {
      throw new APIError('Cannot reopen old completed task', 400, {
        type: 'business_rule_violation',
        message: 'Tasks completed more than 24 hours ago cannot be reopened',
        taskCompletedAt: existingTask.updatedAt,
        hoursSinceCompletion: Math.floor(hoursSinceCompletion)
      });
    }
  }

  // Validate status transitions
  if (updates.status && updates.status !== existingTask.status) {
    const validTransitions = {
      'todo': ['in_progress', 'completed'],
      'in_progress': ['todo', 'completed'],
      'completed': ['todo', 'in_progress'] // Allowed only if < 24 hours (checked above)
    };

    if (!validTransitions[existingTask.status]?.includes(updates.status)) {
      throw new APIError('Invalid status transition', 400, {
        type: 'business_rule_violation',
        message: `Cannot change status from ${existingTask.status} to ${updates.status}`,
        currentStatus: existingTask.status,
        attemptedStatus: updates.status,
        validTransitions: validTransitions[existingTask.status]
      });
    }
  }

  // Check for duplicate titles if title is being updated
  if (updates.title && updates.title.toLowerCase() !== existingTask.title.toLowerCase()) {
    if (process.env.PREVENT_DUPLICATE_TITLES === 'true') {
      try {
        const existingTasks = await repository.findAll({ 
          search: updates.title,
          limit: 5 
        });
        
        const duplicateTitle = existingTasks.tasks.find(
          task => task.id !== existingTask.id && 
                   task.title.toLowerCase() === updates.title.toLowerCase()
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
        console.warn('Could not check for duplicate titles:', error.message);
      }
    }
  }

  // Validate due date changes
  if (updates.dueDate !== undefined) {
    if (updates.dueDate) {
      const dueDate = new Date(updates.dueDate);
      const now = new Date();
      
      // Don't allow setting due date in the past (unless it's being cleared)
      if (dueDate < now && existingTask.status !== 'completed') {
        throw new APIError('Cannot set due date in the past', 400, {
          type: 'business_rule_violation',
          message: 'Due date cannot be set to a past date for incomplete tasks',
          providedDate: updates.dueDate,
          currentTime: now.toISOString()
        });
      }

      // Don't allow due date more than 5 years in the future
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5);
      
      if (dueDate > maxFutureDate) {
        throw new APIError('Due date too far in future', 400, {
          type: 'business_rule_violation',
          message: 'Due date cannot be more than 5 years in the future',
          maxAllowedDate: maxFutureDate.toISOString()
        });
      }
    }
  }

  // Warn about high priority task limits
  if (updates.priority === 'high' && existingTask.priority !== 'high') {
    try {
      const highPriorityTasks = await repository.findAll({ 
        priority: 'high',
        status: 'todo',
        limit: 15 
      });
      
      if (highPriorityTasks.tasks.length >= 10) {
        console.warn(`High priority task limit exceeded: ${highPriorityTasks.tasks.length}/10`);
        // Could throw an error here if you want to enforce the limit strictly
      }
    } catch (error) {
      console.warn('Could not check high priority task limit:', error.message);
    }
  }
}

// Business validation for task deletion
async function performDeleteBusinessValidation(task, repository) {
  // Example: Prevent deletion of recently completed high-priority tasks
  if (task.status === 'completed' && task.priority === 'high') {
    const completedTime = new Date(task.updatedAt);
    const now = new Date();
    const hoursSinceCompletion = (now - completedTime) / (1000 * 60 * 60);
    
    if (hoursSinceCompletion < 1) { // Less than 1 hour ago
      throw new APIError('Cannot delete recently completed high-priority task', 400, {
        type: 'business_rule_violation',
        message: 'High-priority tasks completed within the last hour cannot be deleted',
        taskCompletedAt: task.updatedAt,
        waitTime: `${Math.ceil(1 - hoursSinceCompletion)} minutes`
      });
    }
  }

  // Example: Soft delete for tasks with many dependencies (if you track them)
  // This is just an example - you might have different business rules
  if (task.tags && task.tags.includes('important')) {
    console.warn(`Deleting important task: ${task.title} (ID: ${task.id})`);
    // Could implement soft delete or require additional confirmation
  }
}

// Helper function to determine what changed in an update
function getTaskChanges(oldTask, newTask) {
  const changes = {};
  
  const fieldsToCheck = ['title', 'description', 'status', 'priority', 'dueDate', 'tags'];
  
  fieldsToCheck.forEach(field => {
    const oldValue = oldTask[field];
    const newValue = newTask[field];
    
    // Handle arrays (tags) specially
    if (field === 'tags') {
      const oldTags = Array.isArray(oldValue) ? oldValue.sort() : [];
      const newTags = Array.isArray(newValue) ? newValue.sort() : [];
      
      if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
        changes[field] = {
          from: oldTags,
          to: newTags,
          added: newTags.filter(tag => !oldTags.includes(tag)),
          removed: oldTags.filter(tag => !newTags.includes(tag))
        };
      }
    } else {
      // Handle other fields
      if (oldValue !== newValue) {
        changes[field] = {
          from: oldValue,
          to: newValue
        };
      }
    }
  });
  
  return changes;
}

// Health check for individual task operations
export async function healthCheck(taskId = null) {
  try {
    const repository = getTaskRepository();
    
    if (taskId) {
      // Check specific task
      const task = await repository.findById(taskId);
      return {
        status: task ? 'healthy' : 'task_not_found',
        endpoint: `/api/tasks/${taskId}`,
        taskExists: !!task,
        timestamp: new Date().toISOString()
      };
    } else {
      // General health check
      const stats = await repository.getStats();
      return {
        status: 'healthy',
        endpoint: '/api/tasks/[id]',
        database: {
          connected: true,
          taskCount: stats.total
        },
        operations: {
          get: 'available',
          update: 'available',
          delete: 'available'
        },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      endpoint: taskId ? `/api/tasks/${taskId}` : '/api/tasks/[id]',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}