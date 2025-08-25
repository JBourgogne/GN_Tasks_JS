import React, { useState, useEffect, useCallback } from 'react';
import TaskList from './components/TaskList/TaskList.jsx';
import TaskForm from './components/TaskForm/TaskForm.jsx';
import FilterBar from './components/FilterBar/FilterBar.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
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
    filters: contextFilters,
    createTask,
    updateTask,
    deleteTask,
    loadTasks,
    loadStats,
    updateFilters,
    updateSearch,
    selectTask,
    clearError
  } = useTasks();

  // Local state for UI
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dashboardMode, setDashboardMode] = useState('full'); // 'full', 'compact', 'hidden'

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

  // Handle filter changes from FilterBar
  const handleFiltersChange = useCallback(async (newFilters) => {
    await updateFilters(newFilters);
  }, [updateFilters]);

  // Handle search with debouncing (handled by FilterBar)
  const handleSearchChange = useCallback(async (searchTerm) => {
    await updateSearch(searchTerm);
  }, [updateSearch]);

  // Clear all filters
  const handleClearAllFilters = useCallback(async () => {
    const clearedFilters = {
      status: '',
      priority: '',
      tags: [],
      search: '',
      overdue: false,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };
    await updateFilters(clearedFilters);
  }, [updateFilters]);

  // Dashboard filter clicks
  const handleDashboardFilterChange = useCallback(async (filterChange) => {
    await updateFilters({
      ...contextFilters,
      ...filterChange
    });
  }, [contextFilters, updateFilters]);

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

  // Refresh all data
  const handleRefreshData = async () => {
    await Promise.all([loadTasks(), loadStats()]);
  };

  // Get available tags for FilterBar
  const getAvailableTags = () => {
    if (!stats?.tags?.popular) return [];
    return stats.tags.popular;
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="App-header">
        <div className="header-content">
          <div className="header-main">
            <h1>🚀 Task Management App</h1>
            <p>Full-stack React + Express application with modern task management</p>
          </div>
          
          <div className="header-controls">
            <button 
              className="btn btn-primary"
              onClick={handleCreateTask}
              disabled={loading}
            >
              ✨ Create New Task
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={handleRefreshData}
              disabled={loading}
              title="Refresh all data"
            >
              🔄 Refresh
            </button>
            
            <div className="dashboard-toggle">
              <label>Dashboard: </label>
              <select 
                value={dashboardMode} 
                onChange={(e) => setDashboardMode(e.target.value)}
                className="dashboard-select"
              >
                <option value="full">Full</option>
                <option value="compact">Compact</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* System Status */}
        <div className="status-section">
          <div className="status-info">
            <span>Frontend: ✅ React + Vite</span>
            <span>Backend: {backendStatus}</span>
            <span>Environment: {import.meta.env.MODE}</span>
            {stats && <span>Tasks: {stats.total} total</span>}
          </div>
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
      </header>

      {/* Dashboard */}
      {dashboardMode !== 'hidden' && (
        <Dashboard
          stats={stats}
          tasks={tasks}
          loading={loading && !stats}
          onFilterChange={handleDashboardFilterChange}
          compactMode={dashboardMode === 'compact'}
        />
      )}

      {/* Main Content */}
      <main className="App-main">
        {/* Filter Bar */}
        <FilterBar
          filters={contextFilters}
          onFiltersChange={handleFiltersChange}
          taskStats={stats}
          availableTags={getAvailableTags()}
          loading={loading}
          onClearFilters={handleClearAllFilters}
        />

        {/* Task List */}
        <div className="tasks-section">
          <div className="tasks-header">
            <h3>
              📝 Tasks 
              {contextFilters?.search && ` - Search: "${contextFilters.search}"`}
              {contextFilters?.status && ` - Status: ${contextFilters.status}`}
              {contextFilters?.priority && ` - Priority: ${contextFilters.priority}`}
              {contextFilters?.overdue && ` - Overdue Only`}
            </h3>
            
            {/* Active Filters Summary */}
            {(contextFilters?.search || contextFilters?.status || contextFilters?.priority || 
              contextFilters?.tags?.length > 0 || contextFilters?.overdue) && (
              <div className="active-filters-summary">
                <span className="filters-label">Active filters:</span>
                {contextFilters.search && (
                  <span className="filter-tag">Search: "{contextFilters.search}"</span>
                )}
                {contextFilters.status && (
                  <span className="filter-tag">Status: {contextFilters.status}</span>
                )}
                {contextFilters.priority && (
                  <span className="filter-tag">Priority: {contextFilters.priority}</span>
                )}
                {contextFilters.tags?.map(tag => (
                  <span key={tag} className="filter-tag">#{tag}</span>
                ))}
                {contextFilters.overdue && (
                  <span className="filter-tag">Overdue</span>
                )}
              </div>
            )}
          </div>
          
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
              contextFilters?.search || contextFilters?.status || contextFilters?.priority || contextFilters?.overdue
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

      {/* Development Footer */}
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
              <span>Advanced FilterBar with Search</span>
            </div>
            <div className="status-item">
              <span className="status-icon">✅</span>
              <span>Interactive Dashboard & Statistics</span>
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
          <h3>⚡ Tech Stack Completed</h3>
          <ul>
            <li>⚛️ React 18 with Hooks</li>
            <li>🎯 Context API + Custom Hooks</li>
            <li>⚡ Vite Build Tool</li>
            <li>🔥 Vercel Serverless Functions</li>
            <li>🗄️ TaskRepository Pattern</li>
            <li>📊 Interactive Dashboard</li>
            <li>🔍 Advanced Filtering & Search</li>
            <li>📱 Fully Responsive Design</li>
            <li>🎨 Modern UI/UX with Animations</li>
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