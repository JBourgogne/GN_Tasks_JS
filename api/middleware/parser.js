/**
 * Global error handling for API routes
 */

export class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createErrorResponse(error, requestId = null) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      statusCode: error.statusCode || 500,
      timestamp: new Date().toISOString()
    }
  };

  // Add request ID for tracing
  if (requestId) {
    response.error.requestId = requestId;
  }

  // Add details for API errors
  if (error instanceof APIError && error.details) {
    response.error.details = error.details;
  }

  // Add stack trace in development
  if (!isProduction && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

export function handleAPIError(res, error, requestId = null) {
  const statusCode = error.statusCode || 500;
  const errorResponse = createErrorResponse(error, requestId);
  
  // Log error details
  console.error(`[${new Date().toISOString()}] ${requestId || 'NO_ID'} ERROR:`, {
    message: error.message,
    statusCode,
    stack: error.stack
  });

  res.status(statusCode).json(errorResponse);
}