// Basic Task Statistics API using TaskRepository
import { getTaskRepository } from './data/TaskRepository.js';
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

    // Get repository instance
    const repository = getTaskRepository();

    try {
      const stats = await repository.getStats();
      
      // Add computed statistics
      const enhancedStats = {
        ...stats,
        completion: {
          rate: stats.total > 0 ? Math.round((stats.byStatus.completed / stats.total) * 100) : 0,
          total: stats.byStatus.completed,
          remaining: stats.byStatus.todo + stats.byStatus.in_progress
        },
        productivity: {
          completedToday: stats.completedToday,
          overdueItems: stats.overdue,
          inProgressItems: stats.byStatus.in_progress
        }
      };

      // Log response
      logResponse(req, res, 200);

      // Send response
      res.status(200).json({
        success: true,
        data: {
          statistics: enhancedStats,
          summary: generateSummary(enhancedStats)
        },
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new APIError('Failed to fetch task statistics', 500);
    }

  } catch (error) {
    // Log error response
    if (requestId) {
      logResponse(req, res, error.statusCode || 500);
    }
    
    // Handle error
    handleAPIError(res, error, requestId);
  }
}

/**
 * Generate a summary message based on stats
 */
function generateSummary(stats) {
  const messages = [];
  
  if (stats.total === 0) {
    return 'No tasks yet. Create your first task to get started!';
  }
  
  const completionRate = stats.completion.rate;
  
  if (completionRate >= 80) {
    messages.push('Great job! You\'re doing excellent work.');
  } else if (completionRate >= 60) {
    messages.push('Good progress! Keep up the momentum.');
  } else if (completionRate >= 40) {
    messages.push('You\'re making progress. Stay focused!');
  } else {
    messages.push('Time to tackle some tasks!');
  }
  
  if (stats.productivity.overdueItems > 0) {
    messages.push(`You have ${stats.productivity.overdueItems} overdue task${stats.productivity.overdueItems > 1 ? 's' : ''}.`);
  }
  
  if (stats.productivity.completedToday > 0) {
    messages.push(`You completed ${stats.productivity.completedToday} task${stats.productivity.completedToday > 1 ? 's' : ''} today!`);
  }
  
  if (stats.productivity.inProgressItems > 0) {
    messages.push(`${stats.productivity.inProgressItems} task${stats.productivity.inProgressItems > 1 ? 's' : ''} in progress.`);
  }
  
  return messages.join(' ');
}