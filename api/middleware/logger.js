// Request logging middleware

export function logRequest(req) {
  const timestamp = new Date().toISOString();
  const { method, url } = req;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             'Unknown';
  const contentLength = req.headers['content-length'] || '0';
  const contentType = req.headers['content-type'] || 'none';
  
  // Create request ID for tracing
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${timestamp}] ${requestId} ${method} ${url}`);
  console.log(`[${timestamp}] ${requestId} Client: ${ip} | Agent: ${userAgent.substring(0, 100)}`);
  console.log(`[${timestamp}] ${requestId} Content: ${contentType} (${contentLength} bytes)`);
  
  // Log query parameters if present
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`[${timestamp}] ${requestId} Query:`, JSON.stringify(req.query));
  }
  
  // Add request start time and ID for performance tracking
  req.startTime = Date.now();
  req.requestId = requestId;
  
  return requestId;
}

export function logResponse(req, res, statusCode) {
  if (!req.startTime || !req.requestId) return;
  
  const timestamp = new Date().toISOString();
  const duration = Date.now() - req.startTime;
  const { method, url, requestId } = req;
  
  // Determine log level based on status code
  const logLevel = statusCode >= 500 ? 'ERROR' : 
                   statusCode >= 400 ? 'WARN' : 
                   statusCode >= 300 ? 'INFO' : 
                   'INFO';
  
  console.log(`[${timestamp}] ${requestId} ${method} ${url} - ${statusCode} (${duration}ms) [${logLevel}]`);
  
  // Log slow requests
  if (duration > 1000) {
    console.warn(`[${timestamp}] ${requestId} SLOW REQUEST: ${duration}ms - ${method} ${url}`);
  }
  
  // Add response headers for debugging
  res.setHeader('X-Response-Time', `${duration}ms`);
  res.setHeader('X-Request-ID', requestId);
}

export function logError(error, req) {
  const timestamp = new Date().toISOString();
  const requestId = req?.requestId || 'unknown';
  const method = req?.method || 'unknown';
  const url = req?.url || 'unknown';
  
  console.error(`[${timestamp}] ${requestId} ERROR in ${method} ${url}:`);
  console.error(`[${timestamp}] ${requestId} Message: ${error.message}`);
  console.error(`[${timestamp}] ${requestId} Stack:`, error.stack);
  
  if (error.details) {
    console.error(`[${timestamp}] ${requestId} Details:`, JSON.stringify(error.details, null, 2));
  }
}