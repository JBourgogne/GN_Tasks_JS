import React, { useState, useEffect, useCallback } from 'react';
import TaskList from './components/TaskList/TaskList.jsx';
import TaskForm from './components/TaskForm/TaskForm.jsx';
import FilterBar from './components/FilterBar/FilterBar.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import { TaskProvider } from './context/TaskContext.jsx';
import { useTasks } from './hooks/useTasks.js';
import { tasksAPI } from './utils/api.js';
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

  // Local UI state
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dashboardMode, setDashboardMode] = useState('full');

  // Initialize app - check backend health ONCE
  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('App initialization started');
        const data = await tasksAPI.healthCheck();
        
        if (mounted && data.success) {
          setBackendStatus(`✅ Connected - ${data.data.status}`);
          console.log('Backend health check successful');
        } else if (mounted) {
          throw new Error('Health check failed');
        }
      } catch (error) {
        console.error('Backend connection error:', error);
        if (mounted) {
          setBackendStatus('❌ Backend connection failed');
        }
      }
    };

    initializeApp();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once

  // Filter handlers - simplified
  const handleFiltersChange = useCallback(async (newFilters) => {
    console.log('App: Filter change requested:', newFilters);
    await updateFilters(newFilters);
  }, [updateFilters]);

  const handleSearchChange = useCallback(async (searchTerm) => {
    console.log('App: Search change requested:', searchTerm);
    await updateSearch(searchTerm);
  }, [updateSearch]);

  const handleClearAllFilters = useCallback(async () => {
    console.log('App: Clear all filters requested');
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

  const handleDashboardFilterChange = useCallback(async (filterChange) => {
    console.log('App: Dashboard filter change:', filterChange);
    await updateFilters({
      ...contextFilters,
      ...filterChange
    });
  }, [contextFilters, updateFilters]);

  // Task form handlers
  const handleCreateTask = useCallback(() => {
    console.log('App: Create task button clicked');
    setShowCreateForm(true);
    setEditingTask(null);
    setFormError(null);
  }, []);

  const handleEditTask = useCallback((task) => {
    console.log('App: Edit task requested:', task.id);
    setEditingTask(task);
    setShowCreateForm(true);
    setFormError(null);
  }, []);

  const handleCloseForm = useCallback(() => {
    console.log('App: Form close requested');
    setShowCreateForm(false);
    setEditingTask(null);
    setFormError(null);
  }, []);

  const handleFormSubmit = useCallback(async (taskData) => {
    console.log('App: Form submit requested:', taskData);
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        console.log('App: Task updated successfully');
      } else {
        await createTask(taskData);
        console.log('App: Task created successfully');
      }
      
      // Close form on success
      handleCloseForm();
    } catch (error) {
      console.error('App: Form submit error:', error);
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  }, [editingTask, updateTask, createTask, handleCloseForm]);

  // Task action handlers
  const handleTaskStatusChange = useCallback(async (taskId, newStatus) => {
    console.log('App: Task status change:', taskId, newStatus);
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, [updateTask]);

  const handleTaskSelect = useCallback((task) => {
    selectTask(task);
  }, [selectTask]);

  const handleDeleteTask = useCallback((task) => {
    console.log('App: Delete task requested:', task.id);
    setDeleteConfirm(task);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    console.log('App: Confirming delete for:', deleteConfirm.id);
    try {
      await deleteTask(deleteConfirm.id);
      setDeleteConfirm(null);
      console.log('App: Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [deleteConfirm, deleteTask]);

  const cancelDelete = useCallback(() => {
    console.log('App: Delete cancelled');
    setDeleteConfirm(null);
  }, []);

  // Manual refresh
  const handleRefreshData = useCallback(async () => {
    console.log('App: Manual refresh requested');
    try {
      // Check backend status
      const healthData = await tasksAPI.healthCheck();
      if (healthData.success) {
        setBackendStatus(`✅ Connected - ${healthData.data.status}`);
      }
      
      // Refresh data
      await Promise.all([loadTasks(), loadStats()]);
      console.log('App: Manual refresh completed');
    } catch (error) {
      console.error('App: Manual refresh error:', error);
      setBackendStatus('❌ Backend connection failed');
    }
  }, [loadTasks, loadStats]);

  // Get available tags for FilterBar
  const getAvailableTags = useCallback(() => {
    if (!stats?.tags?.popular) return [];
    return stats.tags.popular;
  }, [stats]);

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
              // Removed disabled={loading} to prevent stuck state
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
            <span>Loading: {loading ? 'Yes' : 'No'}</span>
          </div>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="error-banner">
            <p>❌ {error}</p>
            <button onClick={clearError}>Dismiss</button>
          </div>
        )}

        {/* Global Loading State - Only show for initial load */}
        {loading && tasks.length === 0 && (
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
          loading={false} // Don't disable filter bar during loading
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