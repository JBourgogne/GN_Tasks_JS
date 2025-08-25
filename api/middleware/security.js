// Basic security headers and input sanitization

export function setSecurityHeaders(res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), location=()');
  
  // Don't expose server information
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'TaskAPI/1.0');
}

export function sanitizeInput(obj) {
  if (typeof obj === 'string') {
    return obj
      .trim()
      .replace(/[<>]/g, '') // Basic XSS prevention
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = sanitizeInput(key);
      sanitized[cleanKey] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return obj;
}