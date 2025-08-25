// Schemas for Validating Tasks
import Joi from 'joi';

// Task validation schemas
export const taskSchemas = {
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

  // Update task schema (all fields optional except constraints)
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

// Query parameter validation schemas
export const querySchemas = {
  taskFilters: Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'completed'),
    priority: Joi.string().valid('low', 'medium', 'high'),
    tags: Joi.string(), // Will be split into array later
    search: Joi.string().max(200),
    overdue: Joi.boolean(),
    sortBy: Joi.string().valid('title', 'status', 'priority', 'createdAt', 'updatedAt', 'dueDate').default('updatedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0)
  })
};