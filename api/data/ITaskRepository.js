// TaskRepository Interface

/**
 * @interface ITaskRepository
 */
export class ITaskRepository {
  /**
   * Create a new task
   * @param {Object} taskData - Task data object
   * @param {string} taskData.title - Task title (required)
   * @param {string} [taskData.description] - Task description
   * @param {string} [taskData.status='todo'] - Task status (todo|in_progress|completed)
   * @param {string} [taskData.priority='medium'] - Task priority (low|medium|high)
   * @param {string} [taskData.dueDate] - Due date in ISO string format
   * @param {string[]} [taskData.tags] - Array of tags
   * @returns {Promise<Object>} Created task with generated ID and timestamps
   */
  async create(taskData) {
    throw new Error('create method must be implemented');
  }

  /**
   * Find a task by ID
   * @param {string} id - Task ID
   * @returns {Promise<Object|null>} Task object or null if not found
   */
  async findById(id) {
    throw new Error('findById method must be implemented');
  }

  /**
   * Find all tasks with optional filtering, sorting, and pagination
   * @param {Object} [filters] - Filter options
   * @param {string} [filters.status] - Filter by status
   * @param {string} [filters.priority] - Filter by priority
   * @param {string|string[]} [filters.tags] - Filter by tags (AND operation)
   * @param {string} [filters.search] - Search in title and description
   * @param {boolean} [filters.overdue] - Filter for overdue tasks
   * @param {string} [filters.sortBy] - Field to sort by
   * @param {string} [filters.sortOrder='asc'] - Sort order (asc|desc)
   * @param {number} [filters.limit=50] - Maximum number of results
   * @param {number} [filters.offset=0] - Number of results to skip
   * @returns {Promise<Object>} Object containing tasks array and pagination info
   * @returns {Promise<Object.tasks>} Array of task objects
   * @returns {Promise<Object.pagination>} Pagination information
   */
  async findAll(filters = {}) {
    throw new Error('findAll method must be implemented');
  }

  /**
   * Update an existing task
   * @param {string} id - Task ID
   * @param {Object} updates - Object containing fields to update
   * @returns {Promise<Object|null>} Updated task object or null if not found
   */
  async update(id, updates) {
    throw new Error('update method must be implemented');
  }

  /**
   * Delete a task
   * @param {string} id - Task ID
   * @returns {Promise<Object|null>} Deleted task object or null if not found
   */
  async delete(id) {
    throw new Error('delete method must be implemented');
  }

  /**
   * Get task statistics
   * @returns {Promise<Object>} Statistics object
   * @returns {Promise<Object.total>} Total number of tasks
   * @returns {Promise<Object.byStatus>} Count by status
   * @returns {Promise<Object.byPriority>} Count by priority
   * @returns {Promise<Object.overdue>} Number of overdue tasks
   * @returns {Promise<Object.completedToday>} Number of tasks completed today
   * @returns {Promise<Object.tags>} Tag statistics
   */
  async getStats() {
    throw new Error('getStats method must be implemented');
  }

  /**
   * Clear all tasks (mainly for testing)
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('clear method must be implemented');
  }
}

/**
 * Database Repository Implementation Example
 * This shows how you would implement the interface for a SQL database
 */
export class DatabaseTaskRepository extends ITaskRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
  }

  async create(taskData) {
    // Example SQL implementation:
    /*
    const query = `
      INSERT INTO tasks (id, title, description, status, priority, due_date, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.execute(query, [
      uuidv4(),
      taskData.title,
      taskData.description || '',
      taskData.status || 'todo',
      taskData.priority || 'medium',
      taskData.dueDate,
      JSON.stringify(taskData.tags || []),
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    return this.findById(result.insertId);
    */
    throw new Error('DatabaseTaskRepository implementation needed');
  }

  // ... other methods would be implemented similarly
}

/**
 * Factory function to create repository instances
 * This allows easy switching between implementations
 */
export function createTaskRepository(type = 'memory', config = {}) {
  switch (type) {
    case 'memory':
      const { TaskRepository } = require('./TaskRepository.js');
      return new TaskRepository();
    
    case 'sqlite':
      // return new SQLiteTaskRepository(config.dbPath);
      throw new Error('SQLite repository not implemented yet');
    
    case 'postgres':
      // return new PostgreSQLTaskRepository(config.connectionString);
      throw new Error('PostgreSQL repository not implemented yet');
    
    case 'mongodb':
      // return new MongoDBTaskRepository(config.connectionString);
      throw new Error('MongoDB repository not implemented yet');
    
    default:
      throw new Error(`Unknown repository type: ${type}`);
  }
}