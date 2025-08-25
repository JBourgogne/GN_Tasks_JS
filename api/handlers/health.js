// Health check logic (imported by api/index.js)
import { getTaskRepository } from '../data/TaskRepository.js';

export async function healthCheck() {
  try {
    const repository = getTaskRepository();
    const stats = await repository.getStats();
    
    return {
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
        taskCount: stats.total
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}