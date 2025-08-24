// Vercel serverless function for tasks
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (will reset on each deployment)
// In production, you'd use a database
let tasks = [
  { 
    id: uuidv4(), 
    title: 'Sample Task 1', 
    description: 'This is a sample task',
    status: 'todo',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: uuidv4(), 
    title: 'Sample Task 2', 
    description: 'Another sample task',
    status: 'completed',
    priority: 'high',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      message: 'Tasks endpoint working',
      tasks: tasks,
      count: tasks.length
    });
  } else if (req.method === 'POST') {
    const { title, description, priority = 'medium' } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newTask = {
      id: uuidv4(),
      title,
      description: description || '',
      status: 'todo',
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}