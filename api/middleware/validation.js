// ===== api/middleware/validation.js =====
import { APIError } from './errorHandler.js';

/**
 * Validate request body against a Joi schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Collect all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types (e.g., string "true" to boolean)
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      throw new APIError('Validation failed', 400, {
        type: 'validation_error',
        errors: validationErrors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters against a Joi schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
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
      value.tags = value.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }

    req.query = value;
    next();
  };
}

/**
 * Validate URL parameters
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      throw new APIError('Invalid URL parameters', 400, {
        type: 'validation_error',
        errors: validationErrors
      });
    }

    req.params = value;
    next();
  };
}

// ID parameter schema
export const paramSchemas = {
  taskId: Joi.object({
    id: Joi.string()
      .uuid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'Task ID must be a valid UUID',
        'any.required': 'Task ID is required'
      })
  })
};