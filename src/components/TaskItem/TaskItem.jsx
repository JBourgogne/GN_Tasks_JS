import React from 'react';
import './TaskItem.css';

function TaskItem({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onSelect,
  isSelected = false
}) {
  // Calculate if task is overdue
  const isOverdue = task.dueDate && 
                   new Date(task.dueDate) < new Date() && 
                   task.status !== 'completed';

  // Handle status change
  const handleStatusChange = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };

  // Handle quick actions
  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(task);
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(task);
    }
  };

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    
    return formatDate(dateString);
  };

  return (
    <div 
      className={`task-item ${isSelected ? 'selected' : ''} status-${task.status} ${isOverdue ? 'overdue' : ''}`}
      onClick={handleClick}
    >
      {/* Task Header */}
      <div className="task-header">
        <div className="task-title-section">
          <h4 className="task-title">{task.title}</h4>
          <div className="task-badges">
            <span className={`priority-badge priority-${task.priority}`}>
              {task.priority}
            </span>
            <span className={`status-badge status-${task.status}`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="task-actions">
          <button
            className="action-btn edit-btn"
            onClick={handleEdit}
            title="Edit task"
            aria-label="Edit task"
          >
            ✏️
          </button>
          <button
            className="action-btn delete-btn"
            onClick={handleDelete}
            title="Delete task"
            aria-label="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {/* Task Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="task-tags">
          {task.tags.map((tag, index) => (
            <span key={`${task.id}-${tag}-${index}`} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Task Dates */}
      <div className="task-dates">
        {task.dueDate && (
          <div className={`due-date ${isOverdue ? 'overdue' : ''}`}>
            <span className="date-label">Due:</span>
            <span className="date-value">
              {formatRelativeDate(task.dueDate)}
              {isOverdue && <span className="overdue-indicator"> (Overdue)</span>}
            </span>
          </div>
        )}
        
        <div className="task-timestamps">
          <small>
            Created: {formatDate(task.createdAt)}
            {task.updatedAt !== task.createdAt && (
              <> • Updated: {formatDate(task.updatedAt)}</>
            )}
          </small>
        </div>
      </div>

      {/* Status Change Buttons */}
      <div className="status-actions">
        {task.status === 'todo' && (
          <button
            className="status-btn start-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange('in_progress');
            }}
          >
            ▶️ Start
          </button>
        )}
        
        {task.status === 'in_progress' && (
          <>
            <button
              className="status-btn complete-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange('completed');
              }}
            >
              ✅ Complete
            </button>
            <button
              className="status-btn pause-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange('todo');
              }}
            >
              ⏸️ Pause
            </button>
          </>
        )}
        
        {task.status === 'completed' && (
          <button
            className="status-btn reopen-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange('todo');
            }}
          >
            🔄 Reopen
          </button>
        )}
      </div>
    </div>
  );
}

export default TaskItem;