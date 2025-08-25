import React, { useState, useEffect } from 'react';
import './TaskForm.css';

function TaskForm({
  mode = 'create', // 'create' or 'edit'
  task = null, // Existing task for edit mode
  onSubmit,
  onCancel,
  loading = false,
  error = null
}) {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    tags: []
  });

  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');

  // Initialize form data when task prop changes
  useEffect(() => {
    if (mode === 'edit' && task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '', // Convert ISO to date input format
        tags: task.tags || []
      });
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        tags: []
      });
    }
    setErrors({});
  }, [mode, task]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle tag input
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && tagInput === '' && formData.tags.length > 0) {
      // Remove last tag if backspace on empty input
      removeTag(formData.tags.length - 1);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, index) => index !== indexToRemove)
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    // Description validation
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    // Tags validation
    if (formData.tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }

    // Due date validation
    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      tags: formData.tags.filter(tag => tag.trim()) // Remove empty tags
    };

    try {
      if (onSubmit) {
        await onSubmit(submitData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';

  return (
    <div className="task-form-container">
      <div className="task-form-header">
        <h2>{isCreate ? '✨ Create New Task' : '✏️ Edit Task'}</h2>
        <button 
          className="close-btn"
          onClick={handleCancel}
          type="button"
          aria-label="Close form"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="form-error">
          <p>❌ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="task-form">
        {/* Title Field */}
        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={`form-input ${errors.title ? 'error' : ''}`}
            placeholder="Enter task title..."
            maxLength={100}
            disabled={loading}
          />
          {errors.title && <span className="field-error">{errors.title}</span>}
          <div className="char-count">
            {formData.title.length}/100
          </div>
        </div>

        {/* Description Field */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={`form-textarea ${errors.description ? 'error' : ''}`}
            placeholder="Enter task description..."
            rows={4}
            maxLength={500}
            disabled={loading}
          />
          {errors.description && <span className="field-error">{errors.description}</span>}
          <div className="char-count">
            {formData.description.length}/500
          </div>
        </div>

        {/* Status and Priority Row */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="form-select"
              disabled={loading}
            >
              <option value="todo">📋 To Do</option>
              <option value="in_progress">🔄 In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority" className="form-label">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="form-select"
              disabled={loading}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>
        </div>

        {/* Due Date Field */}
        <div className="form-group">
          <label htmlFor="dueDate" className="form-label">
            Due Date
          </label>
          <input
            type="date"
            id="dueDate"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
            className={`form-input ${errors.dueDate ? 'error' : ''}`}
            disabled={loading}
            min={new Date().toISOString().split('T')[0]} // Prevent past dates
          />
          {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
        </div>

        {/* Tags Field */}
        <div className="form-group">
          <label htmlFor="tags" className="form-label">
            Tags ({formData.tags.length}/10)
          </label>
          
          {/* Existing Tags */}
          {formData.tags.length > 0 && (
            <div className="tags-display">
              {formData.tags.map((tag, index) => (
                <span key={index} className="tag-chip">
                  #{tag}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={() => removeTag(index)}
                    disabled={loading}
                    aria-label={`Remove ${tag} tag`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tag Input */}
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagInputKeyDown}
            className={`form-input ${errors.tags ? 'error' : ''}`}
            placeholder="Type a tag and press Enter..."
            disabled={loading || formData.tags.length >= 10}
          />
          {errors.tags && <span className="field-error">{errors.tags}</span>}
          <div className="form-hint">
            Press Enter or comma to add a tag. Press Backspace to remove the last tag.
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !formData.title.trim()}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner"></span>
                {isCreate ? 'Creating...' : 'Updating...'}
              </span>
            ) : (
              isCreate ? 'Create Task' : 'Update Task'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskForm;