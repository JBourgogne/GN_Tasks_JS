// Enhanced Health Check API with repository status
import { getTaskRepository } from './data/TaskRepository.js';
import { setCorsHeaders, handleCorsPrelight } from './middleware/cors.js';
import { logRequest, logResponse } from './middleware/logger.js';
import { handleAPIError, APIError } from './middleware/errorHandler.js';

export default async function handler(req, res) {
  let requestId;

  try {
    // Handle CORS preflight
    if (handleCorsPrelight(req, res)) {
      return;
    }

    // Set CORS headers
    setCorsHeaders(res, req.headers.origin);

    // Log request
    requestId = logRequest(req);

    // Only allow GET requests
    if (req.method !== 'GET') {
      throw new APIError(`Method ${req.method} not allowed`, 405, {
        allowedMethods: ['GET']
      });
    }

    // Test repository connection
    const repository = getTaskRepository();
    const stats = await repository.getStats();

    // Get health information
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        api: 'operational',
        middleware: 'operational',
        repository: 'operational'
      },
      database: {
        type: 'in-memory',
        status: 'connected',
        taskCount: stats.total,
        indexes: {
          status: 'active',
          priority: 'active',
          tags: 'active'
        }
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version
      }
    };

    // Log response
    logResponse(req, res, 200);

    // Send response
    res.status(200).json({
      success: true,
      data: healthInfo,
      timestamp: new Date().toISOString(),
      requestId
    });

  } catch (error) {
    // Log error response
    if (requestId) {
      logResponse(req, res, error.statusCode || 500);
    }
    
    // Create unhealthy status
    const healthInfo = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        api: 'degraded',
        repository: 'error'
      }
    };
    
    // Handle error but return unhealthy status instead of generic error
    res.status(503).json({
      success: false,
      data: healthInfo,
      timestamp: new Date().toISOString(),
      requestId
    });
  }
}