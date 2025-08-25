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
  const [backendStatus, setBackendStatus] = useState('Checking connection...');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dashboardMode, setDashboardMode] = useState('compact'); // Default to compact

  // Initialize app - check backend health ONCE
  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('Initializing application...');
        const data = await tasksAPI.healthCheck();
        
        if (mounted && data.success) {
          setBackendStatus(`Connected - ${data.data.status}`);
          console.log('Backend connection established');
        } else if (mounted) {
          throw new Error('Health check failed');
        }
      } catch (error) {
        console.error('Backend connection error:', error);
        if (mounted) {
          setBackendStatus('Connection failed');
        }
      }
    };

    initializeApp();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Filter handlers
  const handleFiltersChange = useCallback(async (newFilters) => {
    console.log('Filter update requested:', newFilters);
    await updateFilters(newFilters);
  }, [updateFilters]);

  const handleSearchChange = useCallback(async (searchTerm) => {
    console.log('Search update requested:', searchTerm);
    await updateSearch(searchTerm);
  }, [updateSearch]);

  const handleClearAllFilters = useCallback(async () => {
    console.log('Clearing all filters');
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
    console.log('Dashboard filter update:', filterChange);
    await updateFilters({
      ...contextFilters,
      ...filterChange
    });
  }, [contextFilters, updateFilters]);

  // Task form handlers
  const handleCreateTask = useCallback(() => {
    console.log('Opening task creation form');
    setShowCreateForm(true);
    setEditingTask(null);
    setFormError(null);
  }, []);

  const handleEditTask = useCallback((task) => {
    console.log('Opening task edit form:', task.id);
    setEditingTask(task);
    setShowCreateForm(true);
    setFormError(null);
  }, []);

  const handleCloseForm = useCallback(() => {
    console.log('Closing task form');
    setShowCreateForm(false);
    setEditingTask(null);
    setFormError(null);
  }, []);

  const handleFormSubmit = useCallback(async (taskData) => {
    console.log('Processing form submission:', taskData);
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        console.log('Task updated successfully');
      } else {
        await createTask(taskData);
        console.log('Task created successfully');
      }
      
      // Close form on success
      handleCloseForm();
    } catch (error) {
      console.error('Form submission error:', error);
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  }, [editingTask, updateTask, createTask, handleCloseForm]);

  // Task action handlers
  const handleTaskStatusChange = useCallback(async (taskId, newStatus) => {
    console.log('Updating task status:', taskId, newStatus);
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
    console.log('Requesting task deletion:', task.id);
    setDeleteConfirm(task);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    console.log('Confirming task deletion:', deleteConfirm.id);
    try {
      // Log the task details for debugging
      console.log('Task to delete:', deleteConfirm);
      console.log('Task ID type:', typeof deleteConfirm.id);
      console.log('Task ID value:', deleteConfirm.id);
      
      await deleteTask(deleteConfirm.id);
      setDeleteConfirm(null);
      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Show error message to user but don't close modal
      alert(`Failed to delete task: ${error.message}`);
    }
  }, [deleteConfirm, deleteTask]);

  const cancelDelete = useCallback(() => {
    console.log('Task deletion cancelled');
    setDeleteConfirm(null);
  }, []);

  // Manual refresh
  const handleRefreshData = useCallback(async () => {
    console.log('Manual data refresh initiated');
    try {
      // Check backend status
      const healthData = await tasksAPI.healthCheck();
      if (healthData.success) {
        setBackendStatus(`Connected - ${healthData.data.status}`);
      }
      
      // Refresh data
      await Promise.all([loadTasks(), loadStats()]);
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Data refresh error:', error);
      setBackendStatus('Connection failed');
    }
  }, [loadTasks, loadStats]);

  // Get available tags for FilterBar
  const getAvailableTags = useCallback(() => {
    if (!stats?.tags?.popular) return [];
    return stats.tags.popular;
  }, [stats]);

  return (
    <div className="App">
      <div className="App-content">
        {/* Header */}
        <header className="App-header">
          <div className="header-content">
            <div className="header-main">
              <h1>Task Management System</h1>
              <p>Professional task tracking and workflow management</p>
            </div>
            
            <div className="header-controls">
              <button 
                className="btn btn-primary"
                onClick={handleCreateTask}
              >
                + New Task
              </button>
              
              <button
                className="btn btn-secondary"
                onClick={handleRefreshData}
                disabled={loading}
                title="Refresh data"
              >
                ↻ Refresh
              </button>
              
              <div className="dashboard-toggle">
                <label>Dashboard: </label>
                <select 
                  value={dashboardMode} 
                  onChange={(e) => setDashboardMode(e.target.value)}
                  className="dashboard-select"
                >
                  <option value="compact">Show Below</option>
                  <option value="hidden">Hidden</option>
                  <option value="full">Full Size</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* System Status */}
          <div className="status-section">
            <div className="status-info">
              <span>Frontend: Active</span>
              <span>API: {backendStatus}</span>
              <span>Mode: {import.meta.env.MODE}</span>
              {stats && <span>Total Tasks: {stats.total}</span>}
              <span>Status: {loading ? 'Loading' : 'Ready'}</span>
            </div>
          </div>

          {/* Global Error Display */}
          {error && (
            <div className="error-banner">
              <p>Error: {error}</p>
              <button onClick={clearError}>Dismiss</button>
            </div>
          )}

          {/* Global Loading State */}
          {loading && tasks.length === 0 && (
            <div className="loading-banner">
              <p>Loading tasks...</p>
            </div>
          )}
        </header>

        {/* Main Content - Filter and Tasks First */}
        <main className="App-main">
          <div className="main-content-grid">
            {/* Left Column - Filter and Tasks */}
            <div className="tasks-column">
              {/* Filter Bar */}
              <FilterBar
                filters={contextFilters}
                onFiltersChange={handleFiltersChange}
                taskStats={stats}
                availableTags={getAvailableTags()}
                loading={false}
                onClearFilters={handleClearAllFilters}
              />

              {/* Task List */}
              <div className="tasks-section">
                <div className="tasks-header">
                  <h3>
                    Tasks 
                    {contextFilters?.search && ` - Search: "${contextFilters.search}"`}
                    {contextFilters?.status && ` - Status: ${contextFilters.status}`}
                    {contextFilters?.priority && ` - Priority: ${contextFilters.priority}`}
                    {contextFilters?.overdue && ` - Overdue Items`}
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
                  loading={loading && tasks.length === 0}
                  error={null}
                  onTaskEdit={handleEditTask}
                  onTaskDelete={handleDeleteTask}
                  onTaskStatusChange={handleTaskStatusChange}
                  onTaskSelect={handleTaskSelect}
                  selectedTaskId={selectedTask?.id}
                  emptyStateMessage={
                    contextFilters?.search || contextFilters?.status || contextFilters?.priority || contextFilters?.overdue
                      ? "No tasks match the current filters" 
                      : "No tasks found. Create your first task to get started."
                  }
                />
              </div>
            </div>

            {/* Dashboard Section - Below on mobile, side on desktop */}
            {dashboardMode !== 'hidden' && (
              <div className="dashboard-column">
                <Dashboard
                  stats={stats}
                  tasks={tasks}
                  loading={loading && !stats}
                  onFilterChange={handleDashboardFilterChange}
                  compactMode={true}
                />
              </div>
            )}
          </div>
        </main>

        {/* Development Footer */}
        <footer className="app-footer">
          <div className="development-info">
            <h3>System Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>Task Repository API</span>
              </div>
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>React Components</span>
              </div>
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>Advanced Filtering</span>
              </div>
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>Analytics Dashboard</span>
              </div>
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>State Management</span>
              </div>
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>CRUD Operations</span>
              </div>
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>Search & Sort</span>
              </div>
              <div className="status-item">
                <span className="status-icon">✓</span>
                <span>Mobile Responsive</span>
              </div>
            </div>
          </div>

          <div className="tech-stack">
            <h3>Technical Architecture</h3>
            <ul>
              <li>React 18 with Hooks</li>
              <li>Context API + Custom Hooks</li>
              <li>Vite Development Server</li>
              <li>Vercel Serverless Functions</li>
              <li>Repository Pattern</li>
              <li>Real-time Analytics</li>
              <li>Advanced Search & Filter</li>
              <li>Responsive Design System</li>
              <li>Modern UI/UX Patterns</li>
            </ul>
          </div>
        </footer>
      </div>

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
              <h3>Delete Task</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete this task?</p>
              <div className="task-preview">
                <h4>{deleteConfirm.title}</h4>
                {deleteConfirm.description && (
                  <p>{deleteConfirm.description}</p>
                )}
                {/* Debug info - remove after fixing */}
                <small style={{color: '#ccc', fontSize: '0.8rem'}}>
                  Task ID: {deleteConfirm.id} ({typeof deleteConfirm.id})
                </small>
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