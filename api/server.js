const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Task Management API', 
    version: '1.0.0',
    status: 'running' 
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// Sample tasks endpoint
app.get('/api/tasks', (req, res) => {
  res.json({
    message: 'Tasks endpoint working',
    tasks: [
      { id: '1', title: 'Sample Task 1', status: 'todo' },
      { id: '2', title: 'Sample Task 2', status: 'completed' }
    ]
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📝 Tasks endpoint: http://localhost:${PORT}/api/tasks`);
  });
}

module.exports = app;