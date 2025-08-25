// Simple in-memory rate limiting for serverless functions (In production, you'd use Redis or a dedicated service)

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 1000; // Max requests per window

export function rateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             'unknown';
  
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [key, data] of requestCounts.entries()) {
    if (data.windowStart < windowStart) {
      requestCounts.delete(key);
    }
  }
  
  // Check current IP
  const current = requestCounts.get(ip) || { count: 0, windowStart: now };
  
  // Reset window if needed
  if (current.windowStart < windowStart) {
    current.count = 0;
    current.windowStart = now;
  }
  
  current.count++;
  requestCounts.set(ip, current);
  
  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    const resetTime = new Date(current.windowStart + RATE_LIMIT_WINDOW);
    throw new APIError('Rate limit exceeded', 429, {
      type: 'rate_limit_exceeded',
      message: `Too many requests. Limit: ${RATE_LIMIT_MAX_REQUESTS} per ${RATE_LIMIT_WINDOW / 1000 / 60} minutes`,
      retryAfter: Math.ceil((resetTime - now) / 1000),
      resetTime: resetTime.toISOString(),
      clientIP: ip
    });
  }
  
  return {
    remaining: RATE_LIMIT_MAX_REQUESTS - current.count,
    resetTime: new Date(current.windowStart + RATE_LIMIT_WINDOW),
    limit: RATE_LIMIT_MAX_REQUESTS
  };
}