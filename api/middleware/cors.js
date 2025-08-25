//CORS middleware for Vercel serverless functions

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://gn-tasks-js.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

export function setCorsHeaders(res, origin = '*') {
  // In a production environment, I would be more restrictive with origins
  const allowedOrigin = process.env.NODE_ENV === 'production' 
    ? (ALLOWED_ORIGINS.includes(origin) ? origin : 'null')
    : '*';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

export function handleCorsPrelight(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req.headers.origin);
    res.status(200).end();
    return true;
  }
  return false;
}