// Enhanced Health Check API with middleware
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

    // Get health information
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        api: 'operational',
        middleware: 'operational'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
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
    
    // Handle error
    handleAPIError(res, error, requestId);
  }
}