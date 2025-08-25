import React, { useState } from 'react';
import TaskItem from '../TaskItem/TaskItem.jsx';
import './TaskList.css';

function TaskList({ 
  tasks = [], 
  loading = false, 
  error = null,
  onTaskEdit,
  onTaskDelete, 
  onTaskStatusChange,
  onTaskSelect,
  onLoadMore,
  pagination,
  selectedTaskId,
  emptyStateMessage = "No tasks found",
  showLoadMore = false
}) {
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Handle task actions
  const handleTaskEdit = (task) => {
    if (onTaskEdit) {
      onTaskEdit(task);
    }
  };

  const handleTaskDelete = (task) => {
    if (onTaskDelete) {
      onTaskDelete(task);
    }
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    if (onTaskStatusChange) {
      onTaskStatusChange(taskId, newStatus);
    }
  };

  const handleTaskSelect = (task) => {
    if (onTaskSelect) {
      onTaskSelect(task);
    }
  };

  // Handle sorting
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Sort tasks locally for display
  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
    if (bValue == null) return sortOrder === 'asc' ? -1 : 1;

    // Handle date fields
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'dueDate') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    // Handle priority special case
    if (sortBy === 'priority') {
      const priorityOrder = { low: 1, medium: 2, high: 3 };
      aValue = priorityOrder[aValue] || 0;
      bValue = priorityOrder[bValue] || 0;
    }

    // Handle status special case  
    if (sortBy === 'status') {
      const statusOrder = { todo: 1, in_progress: 2, completed: 3 };
      aValue = statusOrder[aValue] || 0;
      bValue = statusOrder[bValue] || 0;
    }

    // Handle numeric/date comparison
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Group tasks by status for better organization
  const tasksByStatus = {
    todo: sortedTasks.filter(task => task.status === 'todo'),
    in_progress: sortedTasks.filter(task => task.status === 'in_progress'),
    completed: sortedTasks.filter(task => task.status === 'completed')
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // Render loading state
  if (loading) {
    return (
      <div className="task-list-container">
        <div className="task-list-loading">
          <div className="loading-spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="task-list-container">
        <div className="task-list-error">
          <p>❌ Error loading tasks: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className="task-list-container">
        <div className="task-list-empty">
          <div className="empty-icon">📝</div>
          <h3>No Tasks Yet</h3>
          <p>{emptyStateMessage}</p>
          <p>Create your first task to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      {/* List Header */}
      <div className="task-list-header">
        <div className="task-count">
          <h3>{tasks.length} Task{tasks.length !== 1 ? 's' : ''}</h3>
          {pagination && (
            <span className="pagination-info">
              Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </span>
          )}
        </div>

        {/* Sort Controls */}
        <div className="sort-controls">
          <span className="sort-label">Sort by:</span>
          <button 
            className={`sort-btn ${sortBy === 'updatedAt' ? 'active' : ''}`}
            onClick={() => handleSortChange('updatedAt')}
          >
            Updated {getSortIcon('updatedAt')}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'priority' ? 'active' : ''}`}
            onClick={() => handleSortChange('priority')}
          >
            Priority {getSortIcon('priority')}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'dueDate' ? 'active' : ''}`}
            onClick={() => handleSortChange('dueDate')}
          >
            Due Date {getSortIcon('dueDate')}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'title' ? 'active' : ''}`}
            onClick={() => handleSortChange('title')}
          >
            Title {getSortIcon('title')}
          </button>
        </div>
      </div>

      {/* Task Groups */}
      <div className="task-groups">
        {/* To Do Tasks */}
        {tasksByStatus.todo.length > 0 && (
          <div className="task-group">
            <h4 className="group-title todo-group">
              📋 To Do ({tasksByStatus.todo.length})
            </h4>
            <div className="task-group-list">
              {tasksByStatus.todo.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleTaskEdit}
                  onDelete={handleTaskDelete}
                  onStatusChange={handleTaskStatusChange}
                  onSelect={handleTaskSelect}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Tasks */}
        {tasksByStatus.in_progress.length > 0 && (
          <div className="task-group">
            <h4 className="group-title progress-group">
              🔄 In Progress ({tasksByStatus.in_progress.length})
            </h4>
            <div className="task-group-list">
              {tasksByStatus.in_progress.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleTaskEdit}
                  onDelete={handleTaskDelete}
                  onStatusChange={handleTaskStatusChange}
                  onSelect={handleTaskSelect}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {tasksByStatus.completed.length > 0 && (
          <div className="task-group">
            <h4 className="group-title completed-group">
              ✅ Completed ({tasksByStatus.completed.length})
            </h4>
            <div className="task-group-list">
              {tasksByStatus.completed.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleTaskEdit}
                  onDelete={handleTaskDelete}
                  onStatusChange={handleTaskStatusChange}
                  onSelect={handleTaskSelect}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {showLoadMore && pagination && pagination.hasMore && (
        <div className="load-more-section">
          <button 
            className="load-more-btn"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : `Load More (${pagination.total - pagination.offset - pagination.limit} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}

export default TaskList;