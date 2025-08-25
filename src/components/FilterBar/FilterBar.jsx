import React, { useState, useEffect, useCallback } from 'react';
import './FilterBar.css';

function FilterBar({
  filters = {},
  onFiltersChange,
  taskStats = null,
  availableTags = [],
  loading = false,
  onClearFilters,
  onToggleOverdue
}) {
  // Local state for form inputs
  const [localFilters, setLocalFilters] = useState({
    search: '',
    status: '',
    priority: '',
    tags: [],
    overdue: false,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    ...filters
  });

  // Debounced search state
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Update local state when props change
  useEffect(() => {
    setLocalFilters(prev => ({
      ...prev,
      ...filters
    }));
  }, [filters]);

  // Debounced search handler
  const handleSearchChange = useCallback((searchValue) => {
    setLocalFilters(prev => ({ ...prev, search: searchValue }));
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      if (onFiltersChange) {
        onFiltersChange({ search: searchValue });
      }
    }, 300); // 300ms debounce
    
    setSearchTimeout(newTimeout);
  }, [searchTimeout, onFiltersChange]);

  // Immediate filter handlers (no debouncing needed)
  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    if (onFiltersChange) {
      onFiltersChange({ [key]: value });
    }
  };

  // Tag management
  const handleTagToggle = (tag) => {
    const newTags = localFilters.tags.includes(tag)
      ? localFilters.tags.filter(t => t !== tag)
      : [...localFilters.tags, tag];
    
    handleFilterChange('tags', newTags);
  };

  const handleTagRemove = (tagToRemove) => {
    const newTags = localFilters.tags.filter(tag => tag !== tagToRemove);
    handleFilterChange('tags', newTags);
  };

  // Sort handling
  const handleSortChange = (sortBy) => {
    let sortOrder = 'desc';
    
    // Toggle sort order if clicking same field
    if (localFilters.sortBy === sortBy) {
      sortOrder = localFilters.sortOrder === 'desc' ? 'asc' : 'desc';
    }
    
    const newSort = { sortBy, sortOrder };
    setLocalFilters(prev => ({ ...prev, ...newSort }));
    
    if (onFiltersChange) {
      onFiltersChange(newSort);
    }
  };

  // Clear all filters
  const handleClearAll = () => {
    const clearedFilters = {
      search: '',
      status: '',
      priority: '',
      tags: [],
      overdue: false,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };
    
    setLocalFilters(clearedFilters);
    
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Check if any filters are active
  const hasActiveFilters = localFilters.search || 
                          localFilters.status || 
                          localFilters.priority || 
                          localFilters.tags.length > 0 || 
                          localFilters.overdue;

  // Get sort icon
  const getSortIcon = (field) => {
    if (localFilters.sortBy !== field) return '↕️';
    return localFilters.sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="filter-bar">
      {/* Search Section */}
      <div className="filter-section search-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={localFilters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
              disabled={loading}
            />
            {localFilters.search && (
              <button
                className="clear-search-btn"
                onClick={() => handleSearchChange('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-section controls-section">
        <div className="filter-controls">
          {/* Status Filter */}
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <select
              value={localFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
              disabled={loading}
            >
              <option value="">All Status</option>
              <option value="todo">📋 To Do</option>
              <option value="in_progress">🔄 In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>
            {taskStats && (
              <span className="filter-count">
                ({localFilters.status ? taskStats.byStatus[localFilters.status] || 0 : taskStats.total})
              </span>
            )}
          </div>

          {/* Priority Filter */}
          <div className="filter-group">
            <label className="filter-label">Priority:</label>
            <select
              value={localFilters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="filter-select"
              disabled={loading}
            >
              <option value="">All Priorities</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            {taskStats && (
              <span className="filter-count">
                ({localFilters.priority ? taskStats.byPriority[localFilters.priority] || 0 : taskStats.total})
              </span>
            )}
          </div>

          {/* Overdue Toggle */}
          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={localFilters.overdue}
                onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                disabled={loading}
              />
              <span className="checkbox-label">
                ⏰ Overdue only
                {taskStats && taskStats.overdue > 0 && (
                  <span className="filter-count">({taskStats.overdue})</span>
                )}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      {availableTags.length > 0 && (
        <div className="filter-section tags-section">
          <div className="tags-header">
            <label className="filter-label">Filter by Tags:</label>
            {localFilters.tags.length > 0 && (
              <span className="selected-tags-count">
                {localFilters.tags.length} selected
              </span>
            )}
          </div>
          
          {/* Selected Tags */}
          {localFilters.tags.length > 0 && (
            <div className="selected-tags">
              {localFilters.tags.map(tag => (
                <span key={tag} className="selected-tag">
                  #{tag}
                  <button
                    className="remove-tag-btn"
                    onClick={() => handleTagRemove(tag)}
                    title={`Remove ${tag} filter`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Available Tags */}
          <div className="available-tags">
            {availableTags
              .filter(tagData => !localFilters.tags.includes(tagData.tag))
              .slice(0, 10) // Limit to prevent UI overflow
              .map(tagData => (
                <button
                  key={tagData.tag}
                  className="available-tag"
                  onClick={() => handleTagToggle(tagData.tag)}
                  title={`Filter by ${tagData.tag} (${tagData.count} tasks)`}
                >
                  #{tagData.tag} ({tagData.count})
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="filter-section sort-section">
        <div className="sort-controls">
          <label className="filter-label">Sort by:</label>
          <div className="sort-buttons">
            <button 
              className={`sort-btn ${localFilters.sortBy === 'updatedAt' ? 'active' : ''}`}
              onClick={() => handleSortChange('updatedAt')}
              disabled={loading}
            >
              Updated {getSortIcon('updatedAt')}
            </button>
            <button 
              className={`sort-btn ${localFilters.sortBy === 'priority' ? 'active' : ''}`}
              onClick={() => handleSortChange('priority')}
              disabled={loading}
            >
              Priority {getSortIcon('priority')}
            </button>
            <button 
              className={`sort-btn ${localFilters.sortBy === 'dueDate' ? 'active' : ''}`}
              onClick={() => handleSortChange('dueDate')}
              disabled={loading}
            >
              Due Date {getSortIcon('dueDate')}
            </button>
            <button 
              className={`sort-btn ${localFilters.sortBy === 'title' ? 'active' : ''}`}
              onClick={() => handleSortChange('title')}
              disabled={loading}
            >
              Title {getSortIcon('title')}
            </button>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="filter-section actions-section">
        <div className="filter-actions">
          <button
            className="clear-filters-btn"
            onClick={handleClearAll}
            disabled={!hasActiveFilters || loading}
            title="Clear all filters and search"
          >
            🗑️ Clear All
          </button>
          
          <div className="active-filters-summary">
            {hasActiveFilters && (
              <span className="active-filters-text">
                {[
                  localFilters.search && 'Search',
                  localFilters.status && 'Status',
                  localFilters.priority && 'Priority', 
                  localFilters.tags.length && 'Tags',
                  localFilters.overdue && 'Overdue'
                ].filter(Boolean).join(', ')} active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="filter-loading">
          <div className="loading-spinner"></div>
          <span>Filtering...</span>
        </div>
      )}
    </div>
  );
}

export default FilterBar;