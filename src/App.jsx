import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test backend connection and load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Test health endpoint
        const healthResponse = await fetch('/api/health');
        const healthData = await healthResponse.json();
        
        if (healthData.success) {
          setBackendStatus(`✅ Backend connected - ${healthData.data.status}`);
        } else {
          throw new Error('Health check failed');
        }
        
        // Fetch tasks
        const tasksResponse = await fetch('/api/tasks');
        const tasksData = await tasksResponse.json();
        
        if (tasksData.success) {
          setTasks(tasksData.data.tasks || []);
        } else {
          throw new Error(tasksData.error?.message || 'Failed to fetch tasks');
        }

        // Fetch stats
        const statsResponse = await fetch('/api/stats');
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
          setStats(statsData.data.statistics);
        } else {
          console.warn('Failed to fetch stats:', statsData.error?.message);
        }

      } catch (error) {
        console.error('Backend connection error:', error);
        setBackendStatus('❌ Backend connection failed');
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshData = () => {
    // Re-run the effect by updating a dependency
    setLoading(true);
    loadData();
  };

  const loadData = async () => {
    // Same logic as in useEffect
    setLoading(true);
    setError(null);

    try {
      const tasksResponse = await fetch('/api/tasks');
      const tasksData = await tasksResponse.json();
      
      if (tasksData.success) {
        setTasks(tasksData.data.tasks || []);
      }

      const statsResponse = await fetch('/api/stats');
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStats(statsData.data.statistics);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Task Management App</h1>
        <p>Full-stack React + Express application with TaskRepository</p>
        
        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <p>❌ Error: {error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-banner">
            <p>⏳ Loading...</p>
          </div>
        )}

        <div className="status-section">
          <h3>System Status</h3>
          <p>Frontend: ✅ React + Vite running</p>
          <p>Backend: {backendStatus}</p>
          <p>Environment: {import.meta.env.MODE}</p>
        </div>

        {/* Basic Stats Display */}
        {stats && (
          <div className="stats-section">
            <h3>📊 Task Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Total Tasks</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.byStatus?.completed || 0}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.byStatus?.in_progress || 0}</span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.overdue || 0}</span>
                <span className="stat-label">Overdue</span>
              </div>
            </div>
            <div className="completion-rate">
              <span>Completion Rate: {stats.completion?.rate || 0}%</span>
            </div>
          </div>
        )}

        {/* Enhanced Task List */}
        <div className="tasks-section">
          <div className="section-header">
            <h3>📝 Tasks ({tasks.length})</h3>
            <button onClick={refreshData} disabled={loading}>
              🔄 Refresh
            </button>
          </div>
          
          {tasks.length > 0 ? (
            <div className="task-list">
              {tasks.slice(0, 8).map(task => (
                <div key={task.id} className={`task-item status-${task.status}`}>
                  <div className="task-header">
                    <span className="task-title">{task.title}</span>
                    <span className={`priority priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-meta">
                    <span className={`status-badge status-${task.status}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    {task.tags && task.tags.length > 0 && (
                      <div className="task-tags">
                        {task.tags.map((tag, index) => (
                          <span key={`${task.id}-${tag}-${index}`} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {task.dueDate && (
                    <div className="task-due">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                      {new Date(task.dueDate) < new Date() && task.status !== 'completed' && (
                        <span className="overdue-indicator"> (Overdue)</span>
                      )}
                    </div>
                  )}
                  <div className="task-timestamps">
                    <small>
                      Created: {new Date(task.createdAt).toLocaleDateString()} | 
                      Updated: {new Date(task.updatedAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))}
              {tasks.length > 8 && (
                <p className="more-tasks">... and {tasks.length - 8} more tasks</p>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>No tasks found</p>
              {!loading && (
                <button onClick={refreshData}>Load Tasks</button>
              )}
            </div>
          )}
        </div>

        {/* Development Progress */}
        <div className="development-info">
          <h3>🔧 Development Progress</h3>
          <p>✅ Backend API with TaskRepository implemented</p>
          <p>✅ Enhanced middleware and error handling</p>
          <p>✅ Task statistics and filtering</p>
          <p>✅ Frontend state management structure</p>
          <p>🔄 Next: React components (TaskList, TaskForm, etc.)</p>
        </div>

        <div className="tech-stack">
          <h3>Tech Stack</h3>
          <ul>
            <li>⚛️ React 18</li>
            <li>⚡ Vite</li>
            <li>🔥 Vercel Functions</li>
            <li>🗄️ TaskRepository (in-memory)</li>
            <li>🧪 Vitest (ready)</li>
            <li>🎯 Context API (ready)</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;