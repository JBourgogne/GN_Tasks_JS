// Enhanced Tasks API with TaskRepository
import { getTaskRepository } from './data/TaskRepository.js';
import { setCorsHeaders, handleCorsPrelight } from './middleware/cors.js';
import { logRequest, logResponse } from './middleware/logger.js';
import { handleAPIError, APIError } from './middleware/errorHandler.js';
import { parseJSONBody, validateContentType, parseQueryParams } from './middleware/parser.js';

export default async function handler(req, res) {
  let requestId;
  
  try {
    // Handle CORS preflight
    if (handleCorsPrelight(req, res)) {
      return;
    }

    // Set CORS headers for all responses
    setCorsHeaders(res, req.headers.origin);

    // Log request
    requestId = logRequest(req);

    // Validate content type for POST/PUT requests
    validateContentType(req);

    // Get repository instance
    const repository = getTaskRepository();

    // Route to appropriate handler
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
          allowedMethods: ['GET', 'POST']
        });
    }

    // Log response
    logResponse(req, res, statusCode);

    // Send success response
    res.status(statusCode).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      requestId
    });

  } catch (error) {
    // Log response error
    if (requestId) {
      logResponse(req, res, error.statusCode || 500);
    }
    
    // Handle and send error response
    handleAPIError(res, error, requestId);
  }
}

async function handleGetTasks(req, repository) {
  const query = parseQueryParams(req);
  
  // Validate query parameters (basic validation for now)
  const filters = {
    status: query.status,
    priority: query.priority,
    tags: query.tags,
    search: query.search,
    sortBy: query.sortBy || 'updatedAt',
    sortOrder: query.sortOrder || 'desc',
    limit: Math.min(parseInt(query.limit) || 50, 100),
    offset: Math.max(parseInt(query.offset) || 0, 0),
    overdue: query.overdue === 'true' || query.overdue === true
  };

  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  try {
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
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw new APIError('Failed to fetch tasks', 500);
  }
}

async function handleCreateTask(req, repository) {
  const body = parseJSONBody(req);
  
  // Basic validation (will be enhanced with Joi in next step)
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    throw new APIError('Title is required and must be a non-empty string', 400);
  }

  if (body.title.length > 100) {
    throw new APIError('Title must be 100 characters or less', 400);
  }

  if (body.description && body.description.length > 500) {
    throw new APIError('Description must be 500 characters or less', 400);
  }

  if (body.status && !['todo', 'in_progress', 'completed'].includes(body.status)) {
    throw new APIError('Status must be one of: todo, in_progress, completed', 400);
  }

  if (body.priority && !['low', 'medium', 'high'].includes(body.priority)) {
    throw new APIError('Priority must be one of: low, medium, high', 400);
  }

  if (body.tags && !Array.isArray(body.tags)) {
    throw new APIError('Tags must be an array', 400);
  }

  if (body.tags && body.tags.length > 10) {
    throw new APIError('Maximum 10 tags allowed', 400);
  }

  try {
    const newTask = await repository.create({
      title: body.title.trim(),
      description: body.description?.trim() || '',
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      dueDate: body.dueDate || null,
      tags: body.tags || []
    });

    return {
      task: newTask,
      message: 'Task created successfully'
    };
    
  } catch (error) {
    console.error('Error creating task:', error);
    throw new APIError('Failed to create task', 500);
  }
}' || body.title.trim().length === 0) {
    throw new APIError('Title is required and must be a non-empty string', 400);
  }

  if (body.title.length > 100) {
    throw new APIError('Title must be 100 characters or less', 400);
  }

  // Create new task
  const newTask = {
    id: uuidv4(),
    title: body.title.trim(),
    description: body.description?.trim() || '',
    status: body.status || 'todo',
    priority: body.priority || 'medium',
    dueDate: body.dueDate || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tasks.push(newTask);
  
  return {
    task: newTask,
    message: 'Task created successfully'
  };
}