/**
 * TaskRepository - Abstracts task data storage
 * Uses in-memory Map/Set storage that can easily be replaced with database
 */
import { v4 as uuidv4 } from 'uuid';

export class TaskRepository {
  constructor() {
    // Use Map for O(1) lookups by ID
    this.tasks = new Map();
    
    // Use Sets for fast filtering operations
    this.tasksByStatus = new Map([
      ['todo', new Set()],
      ['in_progress', new Set()],
      ['completed', new Set()]
    ]);
    
    this.tasksByPriority = new Map([
      ['low', new Set()],
      ['medium', new Set()],
      ['high', new Set()]
    ]);
    
    // Tag index for fast tag searches
    this.tasksByTag = new Map();
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  /**
   * Initialize with sample data
   * @private
   */
  initializeSampleData() {
    const sampleTasks = [
      {
        id: uuidv4(),
        title: 'Set up project infrastructure',
        description: 'Initialize the project with proper folder structure and dependencies',
        status: 'completed',
        priority: 'high',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        tags: ['setup', 'infrastructure'],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: 'Implement API endpoints',
        description: 'Create RESTful API endpoints for task management',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        tags: ['api', 'backend'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        title: 'Write comprehensive tests',
        description: 'Add unit and integration tests for all components',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        tags: ['testing', 'quality'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    sampleTasks.forEach(task => this._addTask(task));
  }

  /**
   * Add task to all indexes
   * @private
   */
  _addTask(task) {
    // Add to main storage
    this.tasks.set(task.id, task);
    
    // Add to status index
    this.tasksByStatus.get(task.status).add(task.id);
    
    // Add to priority index
    this.tasksByPriority.get(task.priority).add(task.id);
    
    // Add to tag indexes
    task.tags.forEach(tag => {
      if (!this.tasksByTag.has(tag)) {
        this.tasksByTag.set(tag, new Set());
      }
      this.tasksByTag.get(tag).add(task.id);
    });
  }

  /**
   * Remove task from all indexes
   * @private
   */
  _removeTask(task) {
    // Remove from main storage
    this.tasks.delete(task.id);
    
    // Remove from status index
    this.tasksByStatus.get(task.status).delete(task.id);
    
    // Remove from priority index
    this.tasksByPriority.get(task.priority).delete(task.id);
    
    // Remove from tag indexes
    task.tags.forEach(tag => {
      const tagSet = this.tasksByTag.get(tag);
      if (tagSet) {
        tagSet.delete(task.id);
        // Clean up empty tag sets
        if (tagSet.size === 0) {
          this.tasksByTag.delete(tag);
        }
      }
    });
  }

  /**
   * Update task indexes when task is modified
   * @private
   */
  _updateTask(oldTask, newTask) {
    // Remove old task from indexes
    this._removeTask(oldTask);
    
    // Add updated task to indexes
    this._addTask(newTask);
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  async create(taskData) {
    const task = {
      id: uuidv4(),
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || null,
      tags: Array.isArray(taskData.tags) ? [...taskData.tags] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this._addTask(task);
    return { ...task }; // Return copy to prevent external modification
  }

  /**
   * Find task by ID
   * @param {string} id - Task ID
   * @returns {Promise<Object|null>} Task or null if not found
   */
  async findById(id) {
    const task = this.tasks.get(id);
    return task ? { ...task } : null; // Return copy
  }

  /**
   * Find all tasks with optional filtering and sorting
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Results with tasks and pagination info
   */
  async findAll(filters = {}) {
    let taskIds = new Set(this.tasks.keys());

    // Apply filters using indexes for better performance
    if (filters.status) {
      const statusIds = this.tasksByStatus.get(filters.status);
      taskIds = this._intersectSets(taskIds, statusIds || new Set());
    }

    if (filters.priority) {
      const priorityIds = this.tasksByPriority.get(filters.priority);
      taskIds = this._intersectSets(taskIds, priorityIds || new Set());
    }

    if (filters.tags && filters.tags.length > 0) {
      const filterTags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
      
      for (const tag of filterTags) {
        const tagIds = this.tasksByTag.get(tag);
        if (tagIds) {
          taskIds = this._intersectSets(taskIds, tagIds);
        } else {
          // If tag doesn't exist, no tasks match
          taskIds = new Set();
          break;
        }
      }
    }

    // Convert to tasks array for further processing
    let tasks = Array.from(taskIds).map(id => ({ ...this.tasks.get(id) }));

    // Apply text search (can't use indexes for this)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply overdue filter
    if (filters.overdue === true) {
      const now = new Date().toISOString();
      tasks = tasks.filter(task => 
        task.dueDate && task.dueDate < now && task.status !== 'completed'
      );
    }

    // Apply sorting
    if (filters.sortBy) {
      const { sortBy, sortOrder = 'asc' } = filters;
      tasks.sort((a, b) => this._compareTasksForSort(a, b, sortBy, sortOrder));
    } else {
      // Default sort by updatedAt desc
      tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // Apply pagination
    const limit = Math.min(parseInt(filters.limit) || 50, 100);
    const offset = Math.max(parseInt(filters.offset) || 0, 0);
    const total = tasks.length;
    
    const paginatedTasks = tasks.slice(offset, offset + limit);

    return {
      tasks: paginatedTasks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Update a task
   * @param {string} id - Task ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated task or null if not found
   */
  async update(id, updates) {
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return null;
    }

    const updatedTask = {
      ...existingTask,
      ...updates,
      id, // Ensure ID cannot be changed
      createdAt: existingTask.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    // Update indexes
    this._updateTask(existingTask, updatedTask);

    return { ...updatedTask }; // Return copy
  }

  /**
   * Delete a task
   * @param {string} id - Task ID
   * @returns {Promise<Object|null>} Deleted task or null if not found
   */
  async delete(id) {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }

    this._removeTask(task);
    return { ...task }; // Return copy of deleted task
  }

  /**
   * Get task statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    const now = new Date().toISOString();
    const today = new Date().toDateString();

    const stats = {
      total: this.tasks.size,
      byStatus: {
        todo: this.tasksByStatus.get('todo').size,
        in_progress: this.tasksByStatus.get('in_progress').size,
        completed: this.tasksByStatus.get('completed').size
      },
      byPriority: {
        low: this.tasksByPriority.get('low').size,
        medium: this.tasksByPriority.get('medium').size,
        high: this.tasksByPriority.get('high').size
      },
      tags: {
        total: this.tasksByTag.size,
        popular: this._getPopularTags(5)
      }
    };

    // Calculate overdue tasks
    stats.overdue = 0;
    stats.completedToday = 0;

    for (const task of this.tasks.values()) {
      // Count overdue tasks
      if (task.dueDate && task.dueDate < now && task.status !== 'completed') {
        stats.overdue++;
      }

      // Count tasks completed today
      if (task.status === 'completed') {
        const updatedDate = new Date(task.updatedAt).toDateString();
        if (updatedDate === today) {
          stats.completedToday++;
        }
      }
    }

    return stats;
  }

  /**
   * Clear all tasks (useful for testing)
   * @returns {Promise<void>}
   */
  async clear() {
    this.tasks.clear();
    this.tasksByStatus.forEach(set => set.clear());
    this.tasksByPriority.forEach(set => set.clear());
    this.tasksByTag.clear();
  }

  /**
   * Get all tasks (for debugging/testing)
   * @returns {Promise<Array>} All tasks
   */
  async getAllRaw() {
    return Array.from(this.tasks.values()).map(task => ({ ...task }));
  }

  // Utility methods

  /**
   * Intersect two sets efficiently
   * @private
   */
  _intersectSets(setA, setB) {
    const result = new Set();
    const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
    
    for (const item of smaller) {
      if (larger.has(item)) {
        result.add(item);
      }
    }
    
    return result;
  }

  /**
   * Compare tasks for sorting
   * @private
   */
  _compareTasksForSort(a, b, sortBy, sortOrder) {
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

    // Handle numeric/date comparison
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  }

  /**
   * Get most popular tags
   * @private
   */
  _getPopularTags(limit = 5) {
    const tagCounts = Array.from(this.tasksByTag.entries())
      .map(([tag, taskIds]) => ({ tag, count: taskIds.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return tagCounts;
  }
}

// Singleton instance for serverless functions
let repositoryInstance = null;

/**
 * Get singleton TaskRepository instance
 * @returns {TaskRepository} Repository instance
 */
export function getTaskRepository() {
  if (!repositoryInstance) {
    repositoryInstance = new TaskRepository();
  }
  return repositoryInstance;
}

export default TaskRepository;