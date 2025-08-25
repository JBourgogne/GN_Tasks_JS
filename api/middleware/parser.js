// Parser Function

import { APIError } from './errorHandler.js';

/**
 * Parse JSON body from request
 * @param {Request} req - Request object
 * @returns {Object} Parsed JSON body
 */
export function parseJSONBody(req) {
  // In Vercel serverless functions, req.body is already parsed
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  
  // If body is a string, try to parse it
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
  
  // If no body
  return {};
}

/**
 * Validate content type for POST/PUT requests
 * @param {Request} req - Request object
 */
export function validateContentType(req) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('application/json')) {
      throw new APIError('Content-Type must be application/json', 400, {
        type: 'content_type_error',
        received: contentType,
        expected: 'application/json',
        message: 'Request body must be JSON with Content-Type: application/json header'
      });
    }
  }
}

/**
 * Parse query parameters with type conversion
 * @param {Request} req - Request object
 * @returns {Object} Parsed query parameters
 */
export function parseQueryParams(req) {
  const query = req.query || {};
  
  // Convert URL object to plain object if needed
  if (query instanceof URL) {
    const params = {};
    for (const [key, value] of query.searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }
  
  return query;
}

/**
 * Parse and validate pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Pagination parameters
 */
export function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 100);
  const offset = Math.max(parseInt(query.offset) || 0, 0);
  
  return { limit, offset };
}

/**
 * Parse boolean query parameter
 * @param {string|boolean} value - Value to parse
 * @returns {boolean|undefined} Parsed boolean or undefined
 */
export function parseBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  
  return undefined;
}

/**
 * Parse array from comma-separated string
 * @param {string|Array} value - Value to parse
 * @returns {Array} Parsed array
 */
export function parseArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  
  return [];
}

/**
 * Sanitize string input
 * @param {string} value - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeString(value, maxLength = 1000) {
  if (typeof value !== 'string') {
    return '';
  }
  
  return value
    .trim()
    .substring(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}