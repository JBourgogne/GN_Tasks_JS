// Global error handling for API routes

export class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export function createErrorResponse(error, requestId = null) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      statusCode: error.statusCode || 500,
      type: error.details?.type || 'unknown_error',
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  // Add request ID for tracing
  if (requestId) {
    response.error.requestId = requestId;
    response.meta = { requestId };
  }

  // Add details for API errors
  if (error instanceof APIError && error.details) {
    response.error.details = error.details;
    
    // Add helpful information for validation errors
    if (error.details.type === 'validation_error' && error.details.errors) {
      response.error.validationErrors = error.details.errors;
      response.error.summary = error.details.summary || `${error.details.errors.length} validation error(s)`;
    }
  }

  // Add stack trace in development only
  if (!isProduction && error.stack) {
    response.error.stack = error.stack.split('\n');
  }

  // Add helpful hints for common errors
  if (error.statusCode === 404) {
    response.error.hint = 'Check if the resource ID is correct and the resource exists';
  } else if (error.statusCode === 400 && error.details?.type === 'validation_error') {
    response.error.hint = 'Review the validation errors and correct the input data';
  } else if (error.statusCode === 429) {
    response.error.hint = 'Wait before making more requests or contact support for rate limit increases';
  }

  return response;
}

export function handleAPIError(res, error, requestId = null) {
  const statusCode = error.statusCode || 500;
  const errorResponse = createErrorResponse(error, requestId);
  
  // Import and use the logger
  import('./logger.js').then(({ logError }) => {
    logError(error, { requestId, method: 'unknown', url: 'unknown' });
  });

  // Set additional error headers
  res.setHeader('X-Error-Type', error.details?.type || 'unknown_error');
  if (error.statusCode === 429 && error.details?.retryAfter) {
    res.setHeader('Retry-After', error.details.retryAfter);
  }

  res.status(statusCode).json(errorResponse);
}

// Common error creators
export const createNotFoundError = (resource, id) => 
  new APIError(`${resource} not found`, 404, {
    type: 'resource_not_found',
    resource,
    resourceId: id
  });

export const createValidationError = (message, errors) =>
  new APIError(message, 400, {
    type: 'validation_error',
    errors,
    summary: `${errors.length} validation error(s)`
  });

export const createBusinessRuleError = (message, rule) =>
  new APIError(message, 400, {
    type: 'business_rule_violation',
    rule
  });