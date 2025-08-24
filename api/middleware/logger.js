/**
 * Request logging middleware
 */

export function logRequest(req) {
  const timestamp = new Date().toISOString();
  const { method, url } = req;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
  
  // Create request ID for tracing
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${timestamp}] ${requestId} ${method} ${url}`);
  console.log(`[${timestamp}] ${requestId} IP: ${ip} | UA: ${userAgent.substring(0, 100)}`);
  
  // Add request start time for performance tracking
  req.startTime = Date.now();
  req.requestId = requestId;
  
  return requestId;
}

export function logResponse(req, res, statusCode) {
  if (!req.startTime || !req.requestId) return;
  
  const timestamp = new Date().toISOString();
  const duration = Date.now() - req.startTime;
  const { method, url, requestId } = req;
  
  console.log(`[${timestamp}] ${requestId} ${method} ${url} - ${statusCode} (${duration}ms)`);
}