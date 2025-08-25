// api/index.js - Main API router and health check
import { setCorsHeaders, handleCorsPrelight } from './middleware/cors.js';
import { logRequest, logResponse } from './middleware/logger.js';
import { handleAPIError } from './middleware/errorHandler.js';

export default async function handler(req, res) {
  let requestId;
  
  try {
    if (handleCorsPrelight(req, res)) return;
    setCorsHeaders(res, req.headers.origin);
    requestId = logRequest(req);

    // Health check endpoint
    if (req.method === 'GET') {
      const { healthCheck } = await import('./handlers/health.js');
      const response = await healthCheck();
      
      logResponse(req, res, 200);
      res.status(200).json({
        success: true,
        data: response,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: '/api'
        }
      });
      return;
    }

    throw new APIError(`Method ${req.method} not allowed`, 405, {
      allowedMethods: ['GET']
    });

  } catch (error) {
    if (requestId) logResponse(req, res, error.statusCode || 500);
    handleAPIError(res, error, requestId);
  }
}