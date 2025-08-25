import React, { useState, useCallback } from 'react';
import './FilterBar.css';

function FilterBar({
  filters = {},
  onFiltersChange,
  taskStats = null,
  availableTags = [],
  loading = false,
  onClearFilters
}) {
  // Local state only for search input (for immediate feedback)
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Handle search input changes (immediate UI update, debounced API call)
  const handleSearchInputChange = useCallback((e) => {
    const value = e.target.value;
    setSearchInput(value);
    
    // Call the parent handler for debounced API call
    if (onFiltersChange) {
      onFiltersChange({ search: value });
    }
  }, [onFiltersChange]);

  // Handle filter changes (immediate API calls for dropdowns)
  const handleFilterChange = useCallback((key, value) => {
    console.log('FilterBar: Filter change:', key, value);
    if (onFiltersChange) {
      onFiltersChange({ [key]: value });
    }
  }, [onFiltersChange]);

  // Handle tag toggles
  const handleTagToggle = useCallback((tag) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    handleFilterChange('tags', newTags);
  }, [filters.tags, handleFilterChange]);

  // Handle tag removal
  const handleTagRemove = useCallback((tagToRemove) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    handleFilterChange('tags', newTags);
  }, [filters.tags, handleFilterChange]);

  // Handle sort changes
  const handleSortChange = useCallback((sortBy) => {
    let sortOrder = 'desc';
    
    // Toggle sort order if clicking same field
    if (filters.sortBy === sortBy) {
      sortOrder = filters.sortOrder === 'desc' ? 'asc' : 'desc';
    }
    
    if (onFiltersChange) {
      onFiltersChange({ sortBy, sortOrder });
    }
  }, [filters.sortBy, filters.sortOrder, onFiltersChange]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setSearchInput(''); // Clear local search state
    if (onClearFilters) {
      onClearFilters();
    }
  }, [onClearFilters]);

  // Check if any filters are active
  const hasActiveFilters = filters.search || 
                          filters.status || 
                          filters.priority || 
                          (filters.tags && filters.tags.length > 0) || 
                          filters.overdue;

  // Get sort icon
  const getSortIcon = (field) => {
    if (filters.sortBy !== field) return '↕';
    return filters.sortOrder === 'asc' ? '↑' : '↓';
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
              value={searchInput}
              onChange={handleSearchInputChange}
              className="search-input"
              disabled={loading}
            />
            {searchInput && (
              <button
                className="clear-search-btn"
                onClick={() => {
                  setSearchInput('');
                  handleFilterChange('search', '');
                }}
                title="Clear search"
              >
                ×
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
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
              disabled={loading}
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {taskStats && (
              <span className="filter-count">
                ({filters.status ? taskStats.byStatus[filters.status] || 0 : taskStats.total})
              </span>
            )}
          </div>

          {/* Priority Filter */}
          <div className="filter-group">
            <label className="filter-label">Priority:</label>
            <select
              value={filters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="filter-select"
              disabled={loading}
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            {taskStats && (
              <span className="filter-count">
                ({filters.priority ? taskStats.byPriority[filters.priority] || 0 : taskStats.total})
              </span>
            )}
          </div>

          {/* Overdue Toggle */}
          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.overdue || false}
                onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                disabled={loading}
              />
              <span className="checkbox-label">
                Overdue only
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
            {filters.tags && filters.tags.length > 0 && (
              <span className="selected-tags-count">
                {filters.tags.length} selected
              </span>
            )}
          </div>
          
          {/* Selected Tags */}
          {filters.tags && filters.tags.length > 0 && (
            <div className="selected-tags">
              {filters.tags.map(tag => (
                <span key={tag} className="selected-tag">
                  #{tag}
                  <button
                    className="remove-tag-btn"
                    onClick={() => handleTagRemove(tag)}
                    title={`Remove ${tag} filter`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Available Tags */}
          <div className="available-tags">
            {availableTags
              .filter(tagData => !filters.tags || !filters.tags.includes(tagData.tag))
              .slice(0, 10)
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
              className={`sort-btn ${filters.sortBy === 'updatedAt' ? 'active' : ''}`}
              onClick={() => handleSortChange('updatedAt')}
              disabled={loading}
            >
              Updated {getSortIcon('updatedAt')}
            </button>
            <button 
              className={`sort-btn ${filters.sortBy === 'priority' ? 'active' : ''}`}
              onClick={() => handleSortChange('priority')}
              disabled={loading}
            >
              Priority {getSortIcon('priority')}
            </button>
            <button 
              className={`sort-btn ${filters.sortBy === 'dueDate' ? 'active' : ''}`}
              onClick={() => handleSortChange('dueDate')}
              disabled={loading}
            >
              Due Date {getSortIcon('dueDate')}
            </button>
            <button 
              className={`sort-btn ${filters.sortBy === 'title' ? 'active' : ''}`}
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
            Clear All
          </button>
          
          <div className="active-filters-summary">
            {hasActiveFilters && (
              <span className="active-filters-text">
                {[
                  filters.search && 'Search',
                  filters.status && 'Status',
                  filters.priority && 'Priority', 
                  filters.tags && filters.tags.length && 'Tags',
                  filters.overdue && 'Overdue'
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