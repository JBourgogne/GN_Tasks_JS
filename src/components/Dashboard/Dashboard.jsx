import React from 'react';
import './Dashboard.css';

function Dashboard({ 
  stats = null,
  tasks = [],
  loading = false,
  onFilterChange,
  compactMode = false
}) {
  if (loading && !stats) {
    return (
      <div className={`dashboard ${compactMode ? 'compact' : ''}`}>
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`dashboard ${compactMode ? 'compact' : ''}`}>
        <div className="dashboard-error">
          <p>📊 Statistics unavailable</p>
        </div>
      </div>
    );
  }

  // Calculate additional metrics
  const completionRate = stats.total > 0 ? Math.round((stats.byStatus.completed / stats.total) * 100) : 0;
  const productivityScore = calculateProductivityScore(stats);
  const urgentTasks = tasks.filter(task => 
    task.priority === 'high' && 
    task.status !== 'completed'
  ).length;

  // Get trending data
  const trendingTags = stats.tags?.popular?.slice(0, 5) || [];
  
  return (
    <div className={`dashboard ${compactMode ? 'compact' : ''}`}>
      {!compactMode && (
        <div className="dashboard-header">
          <h3>📊 Dashboard Overview</h3>
          <div className="dashboard-timestamp">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        {/* Total Tasks */}
        <div className="metric-card total-tasks" onClick={() => onFilterChange?.({})}>
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <div className="metric-number">{stats.total}</div>
            <div className="metric-label">Total Tasks</div>
            <div className="metric-trend">
              {stats.total > 0 && (
                <span className="trend-indicator positive">
                  📈 Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="metric-card completion-rate">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-number">{completionRate}%</div>
            <div className="metric-label">Completed</div>
            <div className="completion-bar">
              <div 
                className="completion-fill" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div 
          className="metric-card in-progress" 
          onClick={() => onFilterChange?.({ status: 'in_progress' })}
        >
          <div className="metric-icon">🔄</div>
          <div className="metric-content">
            <div className="metric-number">{stats.byStatus.in_progress}</div>
            <div className="metric-label">In Progress</div>
            <div className="metric-trend">
              {stats.byStatus.in_progress > 0 && (
                <span className="trend-indicator active">
                  ⚡ Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div 
          className={`metric-card overdue ${stats.overdue > 0 ? 'alert' : ''}`}
          onClick={() => onFilterChange?.({ overdue: true })}
        >
          <div className="metric-icon">⏰</div>
          <div className="metric-content">
            <div className="metric-number">{stats.overdue}</div>
            <div className="metric-label">Overdue</div>
            <div className="metric-trend">
              {stats.overdue > 0 ? (
                <span className="trend-indicator urgent">
                  🚨 Urgent
                </span>
              ) : (
                <span className="trend-indicator good">
                  ✨ Good
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today's Completed */}
        <div className="metric-card completed-today">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <div className="metric-number">{stats.completedToday}</div>
            <div className="metric-label">Done Today</div>
            <div className="metric-trend">
              {stats.completedToday > 0 && (
                <span className="trend-indicator positive">
                  🔥 Productive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* High Priority Tasks */}
        <div 
          className="metric-card high-priority" 
          onClick={() => onFilterChange?.({ priority: 'high' })}
        >
          <div className="metric-icon">🔴</div>
          <div className="metric-content">
            <div className="metric-number">{urgentTasks}</div>
            <div className="metric-label">High Priority</div>
            <div className="metric-trend">
              {urgentTasks > 0 && (
                <span className="trend-indicator urgent">
                  ⚡ Focus
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      {!compactMode && (
        <div className="status-breakdown">
          <h4>📋 Task Status Breakdown</h4>
          <div className="status-bars">
            <div className="status-bar">
              <div className="status-info">
                <span className="status-label">📋 To Do</span>
                <span className="status-count">{stats.byStatus.todo}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill todo-fill" 
                  style={{ 
                    width: `${stats.total > 0 ? (stats.byStatus.todo / stats.total) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="status-bar">
              <div className="status-info">
                <span className="status-label">🔄 In Progress</span>
                <span className="status-count">{stats.byStatus.in_progress}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill in-progress-fill" 
                  style={{ 
                    width: `${stats.total > 0 ? (stats.byStatus.in_progress / stats.total) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="status-bar">
              <div className="status-info">
                <span className="status-label">✅ Completed</span>
                <span className="status-count">{stats.byStatus.completed}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill completed-fill" 
                  style={{ 
                    width: `${stats.total > 0 ? (stats.byStatus.completed / stats.total) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Priority Distribution */}
      {!compactMode && (
        <div className="priority-breakdown">
          <h4>🎯 Priority Distribution</h4>
          <div className="priority-grid">
            <div 
              className="priority-card high-priority-card"
              onClick={() => onFilterChange?.({ priority: 'high' })}
            >
              <div className="priority-icon">🔴</div>
              <div className="priority-content">
                <div className="priority-number">{stats.byPriority.high}</div>
                <div className="priority-label">High</div>
              </div>
            </div>

            <div 
              className="priority-card medium-priority-card"
              onClick={() => onFilterChange?.({ priority: 'medium' })}
            >
              <div className="priority-icon">🟡</div>
              <div className="priority-content">
                <div className="priority-number">{stats.byPriority.medium}</div>
                <div className="priority-label">Medium</div>
              </div>
            </div>

            <div 
              className="priority-card low-priority-card"
              onClick={() => onFilterChange?.({ priority: 'low' })}
            >
              <div className="priority-icon">🟢</div>
              <div className="priority-content">
                <div className="priority-number">{stats.byPriority.low}</div>
                <div className="priority-label">Low</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trending Tags */}
      {!compactMode && trendingTags.length > 0 && (
        <div className="trending-tags">
          <h4>🏷️ Popular Tags</h4>
          <div className="tags-list">
            {trendingTags.map((tagData, index) => (
              <div 
                key={tagData.tag} 
                className="trending-tag"
                onClick={() => onFilterChange?.({ tags: [tagData.tag] })}
              >
                <span className="tag-rank">#{index + 1}</span>
                <span className="tag-name">#{tagData.tag}</span>
                <span className="tag-count">({tagData.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Productivity Insights */}
      {!compactMode && (
        <div className="productivity-insights">
          <h4>💡 Productivity Insights</h4>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <div className="insight-title">Productivity Score</div>
                <div className="insight-value">{productivityScore}/100</div>
                <div className="insight-description">
                  {getProductivityMessage(productivityScore)}
                </div>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <div className="insight-title">Focus Areas</div>
                <div className="insight-recommendations">
                  {getFocusRecommendations(stats, urgentTasks)}
                </div>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">⚡</div>
              <div className="insight-content">
                <div className="insight-title">Quick Actions</div>
                <div className="quick-actions">
                  {urgentTasks > 0 && (
                    <button 
                      className="quick-action-btn urgent"
                      onClick={() => onFilterChange?.({ priority: 'high', status: 'todo' })}
                    >
                      Focus on {urgentTasks} urgent task{urgentTasks > 1 ? 's' : ''}
                    </button>
                  )}
                  {stats.overdue > 0 && (
                    <button 
                      className="quick-action-btn overdue"
                      onClick={() => onFilterChange?.({ overdue: true })}
                    >
                      Address {stats.overdue} overdue item{stats.overdue > 1 ? 's' : ''}
                    </button>
                  )}
                  {stats.byStatus.in_progress > 0 && (
                    <button 
                      className="quick-action-btn progress"
                      onClick={() => onFilterChange?.({ status: 'in_progress' })}
                    >
                      Continue {stats.byStatus.in_progress} active task{stats.byStatus.in_progress > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Message */}
      <div className="dashboard-summary">
        <div className="summary-message">
          {getSummaryMessage(stats, completionRate, urgentTasks)}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function calculateProductivityScore(stats) {
  if (stats.total === 0) return 0;
  
  const completionRate = (stats.byStatus.completed / stats.total) * 100;
  const overduepenalty = Math.min(stats.overdue * 10, 30); // Max 30 point penalty
  const progressBonus = Math.min(stats.byStatus.in_progress * 5, 20); // Max 20 point bonus
  const todayBonus = Math.min(stats.completedToday * 10, 25); // Max 25 point bonus
  
  const score = Math.max(0, Math.min(100, 
    completionRate - overduepenalty + progressBonus + todayBonus
  ));
  
  return Math.round(score);
}

function getProductivityMessage(score) {
  if (score >= 90) return "🚀 Exceptional! You're on fire!";
  if (score >= 80) return "⭐ Excellent work! Keep it up!";
  if (score >= 70) return "👍 Good progress! Stay focused!";
  if (score >= 60) return "📈 Making steady progress!";
  if (score >= 50) return "💪 Building momentum!";
  return "🎯 Let's get started!";
}

function getFocusRecommendations(stats, urgentTasks) {
  const recommendations = [];
  
  if (stats.overdue > 0) {
    recommendations.push("🚨 Address overdue tasks first");
  }
  if (urgentTasks > 0) {
    recommendations.push("🔴 Focus on high priority items");
  }
  if (stats.byStatus.in_progress > stats.byStatus.todo) {
    recommendations.push("🎯 Complete in-progress tasks");
  }
  if (stats.byStatus.todo > stats.byStatus.in_progress * 3) {
    recommendations.push("🚀 Break down large tasks");
  }
  
  return recommendations.length > 0 
    ? recommendations.join(" • ") 
    : "✨ Great balance! Keep up the good work!";
}

function getSummaryMessage(stats, completionRate, urgentTasks) {
  if (stats.total === 0) {
    return "🌟 Ready to start? Create your first task and begin your productivity journey!";
  }
  
  if (completionRate === 100) {
    return "🎉 Amazing! All tasks completed! Time to celebrate your achievement!";
  }
  
  if (stats.overdue > 0 && urgentTasks > 0) {
    return "🚨 Focus time! You have overdue items and urgent tasks that need attention.";
  }
  
  if (stats.overdue > 0) {
    return `⏰ ${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''} need${stats.overdue === 1 ? 's' : ''} your attention.`;
  }
  
  if (urgentTasks > 0) {
    return `🔥 ${urgentTasks} high priority task${urgentTasks > 1 ? 's' : ''} waiting for you!`;
  }
  
  if (stats.completedToday > 0) {
    return `💪 Great job! You've completed ${stats.completedToday} task${stats.completedToday > 1 ? 's' : ''} today!`;
  }
  
  if (stats.byStatus.in_progress > 0) {
    return `⚡ ${stats.byStatus.in_progress} task${stats.byStatus.in_progress > 1 ? 's' : ''} in progress. Keep the momentum going!`;
  }
  
  return "🎯 You're all set! Choose a task and start making progress!";
}

export default Dashboard;