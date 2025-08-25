import React, { useState, useEffect } from 'react';
import TaskList from './components/TaskList/TaskList.jsx';
import TaskForm from './components/TaskForm/TaskForm.jsx';
import { TaskProvider } from './context/TaskContext.jsx';
import { useTasks } from './hooks/useTasks.js';
import './App.css';

// Main App Content (wrapped in TaskProvider)
function AppContent() {
  const {
    tasks,
    stats,
    loading,
    error,
    selectedTask,
    modal,
    createTask,
    updateTask,
    deleteTask,
    loadTasks,
    loadStats,
    updateFilters,
    selectTask,
    openModal,
    closeModal,
    clearError
  } = useTasks();

  // Local state for UI
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    tags: []
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Initialize app - check backend and load data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Test backend connection
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (data.success) {
          setBackendStatus(`✅ Connected - ${data.data.status}`);
          
          // Load initial data
          await loadTasks();
          await loadStats();
        } else {
          throw new Error('Health check failed');
        }
      } catch (error) {
        console.error('Backend connection error:', error);
        setBackendStatus('❌ Backend connection failed');
      }
    };

    initializeApp();
  }, [loadTasks, loadStats]);

  // Handle filter changes
  const handleFilterChange = async (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    await updateFilters(newFilters);
  };

  // Handle search with debouncing
  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearchChange = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    
    // Debounce search
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => {
      handleFilterChange({ search: searchTerm });
    }, 500));
  };

  // Task form handlers
  const handleCreateTask = () => {
    setShowCreateForm(true);
    setEditingTask(null);
    setFormError(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowCreateForm(true);
    setFormError(null);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingTask(null);
    setFormError(null);
  };

  const handleFormSubmit = async (taskData) => {
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await createTask(taskData);
      }
      
      // Success - close form and refresh data
      handleCloseForm();
      await loadStats(); // Refresh stats after create/update
    } catch (error) {
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Task action handlers
  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      await loadStats(); // Refresh stats after status change
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleTaskSelect = (task) => {
    selectTask(task);
  };

  const handleDeleteTask = (task) => {
    setDeleteConfirm(task);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteTask(deleteConfirm.id);
      await loadStats(); // Refresh stats after delete
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Calculate filtered task counts for display
  const getFilteredTaskCount = (status) => {
    return tasks.filter(task => task.status === status).length;
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="App-header">
        <h1>🚀 Task Management App</h1>
        <p>Full-stack React + Express application with modern task management</p>
        
        {/* System Status */}
        <div className="status-section">
          <h3>System Status</h3>
          <p>Frontend: ✅ React + Vite running</p>
          <p>Backend: {backendStatus}</p>
          <p>Environment: {import.meta.env.MODE}</p>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="error-banner">
            <p>❌ {error}</p>
            <button onClick={clearError}>Dismiss</button>
          </div>
        )}

        {/* Global Loading State */}
        {loading && !tasks.length && (
          <div className="loading-banner">
            <p>⏳ Loading tasks...</p>
          </div>
        )}

        {/* Statistics Dashboard */}
        {stats && (
          <div className="stats-section">
            <h3>📊 Task Overview</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Total Tasks</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.byStatus?.todo || 0}</span>
                <span className="stat-label">To Do</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.byStatus?.in_progress || 0}</span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.byStatus?.completed || 0}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.overdue || 0}</span>
                <span className="stat-label">Overdue</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.completedToday || 0}</span>
                <span className="stat-label">Done Today</span>
              </div>
            </div>
            <div className="completion-rate">
              <span>Completion Rate: {stats.completion?.rate || 0}%</span>
            </div>
            {stats.productivity?.summary && (
              <div className="productivity-summary">
                <p>{stats.productivity.summary}</p>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="App-main">
        {/* Filter and Search Section */}
        <div className="controls-section">
          <div className="section-header">
            <h3>📝 Task Management</h3>
            <button 
              className="btn btn-primary"
              onClick={handleCreateTask}
              disabled={loading}
            >
              ✨ Create New Task
            </button>
          </div>

          {/* Search and Filters */}
          <div className="filters-container">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-controls">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value })}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="todo">📋 To Do</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange({ priority: e.target.value })}
                className="filter-select"
              >
                <option value="">All Priorities</option>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>

              <button
                onClick={() => {
                  setFilters({ status: '', priority: '', search: '', tags: [] });
                  handleFilterChange({ status: '', priority: '', search: '', tags: [] });
                }}
                className="btn btn-secondary"
                disabled={!filters.status && !filters.priority && !filters.search}
              >
                Clear Filters
              </button>

              <button
                onClick={() => {
                  loadTasks();
                  loadStats();
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="tasks-section">
          <TaskList
            tasks={tasks}
            loading={loading && tasks.length === 0} // Only show loading for initial load
            error={null} // Errors are handled globally
            onTaskEdit={handleEditTask}
            onTaskDelete={handleDeleteTask}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskSelect={handleTaskSelect}
            selectedTaskId={selectedTask?.id}
            emptyStateMessage={
              filters.search || filters.status || filters.priority 
                ? "No tasks match your current filters" 
                : "No tasks yet. Create your first task to get started!"
            }
          />
        </div>
      </main>

      {/* Task Form Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <TaskForm
              mode={editingTask ? 'edit' : 'create'}
              task={editingTask}
              onSubmit={handleFormSubmit}
              onCancel={handleCloseForm}
              loading={formLoading}
              error={formError}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>🗑️ Delete Task</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete this task?</p>
              <div className="task-preview">
                <h4>{deleteConfirm.title}</h4>
                {deleteConfirm.description && (
                  <p>{deleteConfirm.description}</p>
                )}
              </div>
              <p className="delete-warning">This action cannot be undone.</p>
            </div>
            <div className="delete-modal-actions">
              <button 
                className="btn btn-cancel"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Development Info Footer */}
      <footer className="app-footer">
        <div className="development-info">
          <h3>🔧 Development Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-icon">✅</span>
              <span>Backend API with TaskRepository</span>
            </div>
            <div className="status-item">
              <span className="status-icon">✅</span>
              <span>React Components (TaskList, TaskForm, TaskItem)</span>
            </div>
            <div className="status-item">
              <span className="status-icon">✅</span>
              <span>Context API State Management</span>
            </div>
            <div className="status-item">
              <span className="status-icon">✅</span>
              <span>Full CRUD Operations</span>
            </div>
            <div className="status-item">
              <span className="status-icon">✅</span>
              <span>Filtering, Search & Sorting</span>
            </div>
            <div className="status-item">
              <span className="status-icon">✅</span>
              <span>Responsive Design</span>
            </div>
          </div>
        </div>

        <div className="tech-stack">
          <h3>⚡ Tech Stack</h3>
          <ul>
            <li>⚛️ React 18 with Hooks</li>
            <li>🎯 Context API</li>
            <li>⚡ Vite Build Tool</li>
            <li>🔥 Vercel Serverless Functions</li>
            <li>🗄️ TaskRepository Pattern</li>
            <li>📱 Responsive CSS</li>
            <li>🎨 Modern UI/UX</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

// Root App Component with TaskProvider
function App() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}

export default App;