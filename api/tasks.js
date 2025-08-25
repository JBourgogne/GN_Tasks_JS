// Enhanced Tasks API with proper middleware
import { v4 as uuidv4 } from 'uuid';
import { setCorsHeaders, handleCorsPrelight } from './middleware/cors.js';
import { logRequest, logResponse } from './middleware/logger.js';
import { handleAPIError, APIError } from './middleware/errorHandler.js';
import { parseJSONBody, validateContentType, parseQueryParams } from './middleware/parser.js';

// In-memory storage (will be replaced with TaskRepository in next step)
let tasks = [
  { 
    id: uuidv4(), 
    title: 'Sample Task 1', 
    description: 'This is a sample task',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    tags: ['sample'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: uuidv4(), 
    title: 'Sample Task 2', 
    description: 'Another sample task',
    status: 'completed',
    priority: 'high',
    dueDate: new Date().toISOString(),
    tags: ['sample', 'completed'],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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

    // Route to appropriate handler
    let statusCode = 200;
    let response;

    switch (req.method) {
      case 'GET':
        response = await handleGetTasks(req);
        break;
        
      case 'POST':
        response = await handleCreateTask(req);
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

async function handleGetTasks(req) {
  const query = parseQueryParams(req);
  
  // Basic filtering (will be enhanced with proper validation later)
  let filteredTasks = [...tasks];
  
  // Filter by status
  if (query.status) {
    filteredTasks = filteredTasks.filter(task => task.status === query.status);
  }
  
  // Filter by priority
  if (query.priority) {
    filteredTasks = filteredTasks.filter(task => task.priority === query.priority);
  }
  
  // Simple search
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filteredTasks = filteredTasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm)
    );
  }

  return {
    tasks: filteredTasks,
    total: filteredTasks.length,
    filters: query
  };
}

async function handleCreateTask(req) {
  const body = parseJSONBody(req);
  
  // Basic validation
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
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