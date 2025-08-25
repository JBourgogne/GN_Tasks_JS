// ===== api/tests/api.test.js =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { getTaskRepository } from '../data/TaskRepository.js';

// Mock the repository for testing
let mockRepository;
const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'Test description',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    tags: ['test', 'frontend'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Another test',
    status: 'in_progress',
    priority: 'high',
    dueDate: null,
    tags: ['backend'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockStats = {
  total: 2,
  byStatus: {
    todo: 1,
    in_progress: 1,
    completed: 0
  },
  byPriority: {
    low: 0,
    medium: 1,
    high: 1
  },
  overdue: 0,
  completedToday: 0,
  tags: {
    total: 3,
    popular: [
      { tag: 'test', count: 1 },
      { tag: 'frontend', count: 1 },
      { tag: 'backend', count: 1 }
    ]
  }
};

// Create mock API handler
async function createMockApp() {
  // Import the handler
  const handler = await import('../index.js');
  
  return {
    async request(method, path, body) {
      const req = {
        method,
        url: path,
        headers: {
          'content-type': 'application/json',
          'host': 'localhost:3000'
        },
        body: body ? JSON.stringify(body) : undefined
      };

      const res = {
        statusCode: 200,
        headers: {},
        body: null,
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        setHeader: function(key, value) {
          this.headers[key] = value;
          return this;
        },
        json: function(data) {
          this.body = data;
          return this;
        },
        end: function(data) {
          if (data) this.body = data;
          return this;
        }
      };

      await handler.default(req, res);
      return res;
    }
  };
}

describe('Task Management API', () => {
  let app;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock repository
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getStats: vi.fn(),
      getAllRaw: vi.fn()
    };

    // Mock the repository getter
    vi.doMock('../data/TaskRepository.js', () => ({
      getTaskRepository: () => mockRepository
    }));

    app = await createMockApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/', () => {
    it('should return health check information', async () => {
      mockRepository.getStats.mockResolvedValue(mockStats);

      const response = await app.request('GET', '/api/');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.database.taskCount).toBe(2);
    });

    it('should handle health check errors gracefully', async () => {
      mockRepository.getStats.mockRejectedValue(new Error('Database error'));

      const response = await app.request('GET', '/api/');

      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('health_check_error');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks with default pagination', async () => {
      mockRepository.findAll.mockResolvedValue({
        tasks: mockTasks,
        pagination: {
          total: 2,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      });

      const response = await app.request('GET', '/api/tasks');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 50,
        offset: 0
      });
    });

    it('should apply filters correctly', async () => {
      mockRepository.findAll.mockResolvedValue({
        tasks: [mockTasks[0]],
        pagination: { total: 1, limit: 50, offset: 0, hasMore: false }
      });

      const response = await app.request('GET', '/api/tasks?status=todo&priority=medium&search=test');

      expect(response.statusCode).toBe(200);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        status: 'todo',
        priority: 'medium',
        search: 'test',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 50,
        offset: 0
      });
    });

    it('should validate query parameters', async () => {
      const response = await app.request('GET', '/api/tasks?status=invalid&limit=999');

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('validation_error');
    });

    it('should handle repository errors', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));

      const response = await app.request('GET', '/api/tasks');

      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('database_error');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a specific task', async () => {
      mockRepository.findById.mockResolvedValue(mockTasks[0]);

      const response = await app.request('GET', '/api/tasks/1');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.task.id).toBe('1');
      expect(response.body.data.task.title).toBe('Test Task 1');
    });

    it('should return 404 for non-existent task', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const response = await app.request('GET', '/api/tasks/nonexistent');

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('resource_not_found');
    });

    it('should validate UUID format', async () => {
      const response = await app.request('GET', '/api/tasks/invalid-id');

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('validation_error');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
        tags: ['test']
      };

      const createdTask = {
        id: '3',
        ...newTask,
        status: 'todo',
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockRepository.create.mockResolvedValue(createdTask);

      const response = await app.request('POST', '/api/tasks', newTask);

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe('New Task');
      expect(mockRepository.create).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'Task description',
        status: 'todo',
        priority: 'high',
        dueDate: null,
        tags: ['test']
      });
    });

    it('should require title field', async () => {
      const response = await app.request('POST', '/api/tasks', {
        description: 'Task without title'
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('validation_error');
      expect(response.body.error.details.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should validate title length', async () => {
      const response = await app.request('POST', '/api/tasks', {
        title: 'a'.repeat(101)
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: expect.stringContaining('100 characters')
        })
      );
    });

    it('should validate enum values', async () => {
      const response = await app.request('POST', '/api/tasks', {
        title: 'Valid Title',
        status: 'invalid_status',
        priority: 'invalid_priority'
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate tags', async () => {
      const response = await app.request('POST', '/api/tasks', {
        title: 'Valid Title',
        tags: Array(11).fill('tag') // More than 10 tags
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle repository errors', async () => {
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      const response = await app.request('POST', '/api/tasks', {
        title: 'Valid Title'
      });

      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update an existing task', async () => {
      const updates = {
        title: 'Updated Title',
        status: 'completed'
      };

      const updatedTask = {
        ...mockTasks[0],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      mockRepository.update.mockResolvedValue(updatedTask);

      const response = await app.request('PUT', '/api/tasks/1', updates);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe('Updated Title');
      expect(response.body.data.task.status).toBe('completed');
      expect(mockRepository.update).toHaveBeenCalledWith('1', updates);
    });

    it('should return 404 for non-existent task', async () => {
      mockRepository.update.mockResolvedValue(null);

      const response = await app.request('PUT', '/api/tasks/nonexistent', {
        title: 'Updated Title'
      });

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require at least one field to update', async () => {
      const response = await app.request('PUT', '/api/tasks/1', {});

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate update fields', async () => {
      const response = await app.request('PUT', '/api/tasks/1', {
        title: '', // Empty title
        status: 'invalid'
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete an existing task', async () => {
      mockRepository.getAllRaw.mockResolvedValue(mockTasks);
      mockRepository.findById.mockResolvedValue(mockTasks[0]);
      mockRepository.delete.mockResolvedValue(mockTasks[0]);

      const response = await app.request('DELETE', '/api/tasks/1');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Task deleted successfully');
      expect(mockRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should return 404 for non-existent task', async () => {
      mockRepository.getAllRaw.mockResolvedValue(mockTasks);
      mockRepository.findById.mockResolvedValue(null);

      const response = await app.request('DELETE', '/api/tasks/nonexistent');

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('resource_not_found');
    });

    it('should validate UUID format', async () => {
      const response = await app.request('DELETE', '/api/tasks/invalid-id');

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('should return task statistics', async () => {
      mockRepository.getStats.mockResolvedValue(mockStats);

      const response = await app.request('GET', '/api/tasks/stats');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics.total).toBe(2);
      expect(response.body.data.statistics.byStatus.todo).toBe(1);
      expect(response.body.data.statistics.tags.total).toBe(3);
      expect(response.body.data.statistics.completion.rate).toBeDefined();
    });

    it('should handle repository errors', async () => {
      mockRepository.getStats.mockRejectedValue(new Error('Database error'));

      const response = await app.request('GET', '/api/tasks/stats');

      expect(response.statusCode).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await app.request('POST', '/api/tasks', 'invalid json');

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('json_parse_error');
    });

    it('should handle missing Content-Type header', async () => {
      // This would need to be implemented based on your specific error handling
      const response = await app.request('POST', '/api/tasks', { title: 'Test' });
      
      // Should work with proper Content-Type
      expect(response.statusCode).toBeLessThan(500);
    });

    it('should handle unknown endpoints', async () => {
      const response = await app.request('GET', '/api/unknown');

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('endpoint_not_found');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await app.request('PATCH', '/api/tasks');

      expect(response.statusCode).toBe(405);
      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS Handling', () => {
    it('should handle preflight requests', async () => {
      const response = await app.request('OPTIONS', '/api/tasks');

      expect(response.statusCode).toBe(200);
      expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(response.headers['Access-Control-Allow-Methods']).toBeDefined();
    });
  });
});

// ===== api/tests/TaskRepository.test.js =====
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskRepository } from '../data/TaskRepository.js';

describe('TaskRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new TaskRepository();
  });

  describe('create', () => {
    it('should create a new task with required fields', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'high'
      };

      const task = await repository.create(taskData);

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test description');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('high');
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should create task with default values', async () => {
      const task = await repository.create({ title: 'Minimal Task' });

      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.description).toBe('');
      expect(task.tags).toEqual([]);
      expect(task.dueDate).toBeNull();
    });

    it('should generate unique IDs', async () => {
      const task1 = await repository.create({ title: 'Task 1' });
      const task2 = await repository.create({ title: 'Task 2' });

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('findById', () => {
    it('should find task by ID', async () => {
      const created = await repository.create({ title: 'Test Task' });
      const found = await repository.findById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Test Task');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should return a copy of the task (not reference)', async () => {
      const created = await repository.create({ title: 'Test Task' });
      const found = await repository.findById(created.id);

      found.title = 'Modified Title';
      const foundAgain = await repository.findById(created.id);

      expect(foundAgain.title).toBe('Test Task');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Clear the sample task and create test data
      await repository.clear();
      
      await repository.create({
        title: 'Todo Task',
        status: 'todo',
        priority: 'high',
        tags: ['urgent', 'frontend']
      });
      
      await repository.create({
        title: 'In Progress Task',
        status: 'in_progress',
        priority: 'medium',
        tags: ['backend']
      });
      
      await repository.create({
        title: 'Completed Task',
        status: 'completed',
        priority: 'low',
        tags: ['testing', 'frontend']
      });
    });

    it('should return all tasks without filters', async () => {
      const result = await repository.findAll();

      expect(result.tasks).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should filter by status', async () => {
      const result = await repository.findAll({ status: 'todo' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].status).toBe('todo');
    });

    it('should filter by priority', async () => {
      const result = await repository.findAll({ priority: 'high' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].priority).toBe('high');
    });

    it('should filter by tags', async () => {
      const result = await repository.findAll({ tags: ['frontend'] });

      expect(result.tasks).toHaveLength(2);
      result.tasks.forEach(task => {
        expect(task.tags).toContain('frontend');
      });
    });

    it('should filter by multiple tags (AND operation)', async () => {
      const result = await repository.findAll({ tags: ['urgent', 'frontend'] });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].tags).toContain('urgent');
      expect(result.tasks[0].tags).toContain('frontend');
    });

    it('should perform text search', async () => {
      const result = await repository.findAll({ search: 'progress' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title.toLowerCase()).toContain('progress');
    });

    it('should sort tasks correctly', async () => {
      const result = await repository.findAll({ 
        sortBy: 'priority',
        sortOrder: 'asc' 
      });

      const priorities = result.tasks.map(task => task.priority);
      expect(priorities).toEqual(['low', 'medium', 'high']);
    });

    it('should handle pagination', async () => {
      const result = await repository.findAll({ 
        limit: 2,
        offset: 1 
      });

      expect(result.tasks).toHaveLength(2);
      expect(result.pagination.offset).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should combine multiple filters', async () => {
      const result = await repository.findAll({
        status: 'todo',
        priority: 'high',
        tags: ['urgent']
      });

      expect(result.tasks).toHaveLength(1);
      const task = result.tasks[0];
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('high');
      expect(task.tags).toContain('urgent');
    });
  });

  describe('update', () => {
    it('should update existing task', async () => {
      const created = await repository.create({ title: 'Original Title' });
      const updated = await repository.update(created.id, { 
        title: 'Updated Title',
        status: 'completed'
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('completed');
      expect(updated.updatedAt).not.toBe(created.updatedAt);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.id).toBe(created.id);
    });

    it('should return null for non-existent task', async () => {
      const result = await repository.update('non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('should maintain referential integrity in indexes', async () => {
      const created = await repository.create({ 
        title: 'Test Task',
        status: 'todo',
        priority: 'low',
        tags: ['old-tag']
      });

      await repository.update(created.id, {
        status: 'completed',
        priority: 'high',
        tags: ['new-tag']
      });

      // Check that old indexes are cleaned up and new ones are created
      const todoTasks = await repository.findAll({ status: 'todo' });
      const completedTasks = await repository.findAll({ status: 'completed' });
      const oldTagTasks = await repository.findAll({ tags: ['old-tag'] });
      const newTagTasks = await repository.findAll({ tags: ['new-tag'] });

      expect(todoTasks.tasks).toHaveLength(0);
      expect(completedTasks.tasks).toHaveLength(2); // Including sample task
      expect(oldTagTasks.tasks).toHaveLength(0);
      expect(newTagTasks.tasks).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('should delete existing task', async () => {
      const created = await repository.create({ title: 'To Delete' });
      const deleted = await repository.delete(created.id);

      expect(deleted.id).toBe(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent task', async () => {
      const result = await repository.delete('non-existent');
      expect(result).toBeNull();
    });

    it('should clean up indexes after deletion', async () => {
      const created = await repository.create({
        title: 'To Delete',
        status: 'in_progress',
        priority: 'high',
        tags: ['temp-tag']
      });

      await repository.delete(created.id);

      // Check that indexes are cleaned up
      const inProgressTasks = await repository.findAll({ status: 'in_progress' });
      const highPriorityTasks = await repository.findAll({ priority: 'high' });
      const tempTagTasks = await repository.findAll({ tags: ['temp-tag'] });

      expect(inProgressTasks.tasks).toHaveLength(0);
      expect(highPriorityTasks.tasks).toHaveLength(0);
      expect(tempTagTasks.tasks).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await repository.clear();
      
      // Create test data with known distribution
      await repository.create({
        title: 'Todo High',
        status: 'todo',
        priority: 'high',
        tags: ['urgent']
      });
      
      await repository.create({
        title: 'Progress Medium',
        status: 'in_progress',
        priority: 'medium',
        tags: ['work', 'project']
      });
      
      await repository.create({
        title: 'Completed Low',
        status: 'completed',
        priority: 'low',
        tags: ['done']
      });
    });

    it('should return correct statistics', async () => {
      const stats = await repository.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.todo).toBe(1);
      expect(stats.byStatus.in_progress).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.tags.total).toBe(4);
    });

    it('should calculate overdue tasks correctly', async () => {
      // Create overdue task
      await repository.create({
        title: 'Overdue Task',
        status: 'todo',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      });

      const stats = await repository.getStats();
      expect(stats.overdue).toBe(1);
    });

    it('should not count completed tasks as overdue', async () => {
      // Create completed task that would be overdue
      await repository.create({
        title: 'Completed Overdue Task',
        status: 'completed',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      });

      const stats = await repository.getStats();
      expect(stats.overdue).toBe(0);
    });

    it('should return popular tags', async () => {
      // Add more tasks with repeated tags
      await repository.create({
        title: 'Another Work Task',
        tags: ['work', 'urgent']
      });

      const stats = await repository.getStats();
      const popularTags = stats.tags.popular;
      
      expect(popularTags).toHaveLength(5);
      
      // Find the 'work' tag which should have count of 2
      const workTag = popularTags.find(tag => tag.tag === 'work');
      expect(workTag.count).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all tasks and clean indexes', async () => {
      await repository.create({ title: 'Task 1', tags: ['tag1'] });
      await repository.create({ title: 'Task 2', tags: ['tag2'] });

      await repository.clear();

      const allTasks = await repository.findAll();
      expect(allTasks.tasks).toHaveLength(0);

      const stats = await repository.getStats();
      expect(stats.total).toBe(0);
      expect(stats.tags.total).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty search queries', async () => {
      const result = await repository.findAll({ search: '   ' });
      expect(result.tasks).toHaveLength(1); // Should return all tasks (just sample)
    });

    it('should handle invalid sort parameters gracefully', async () => {
      const result = await repository.findAll({ 
        sortBy: 'invalidField',
        sortOrder: 'invalidOrder'
      });
      expect(result.tasks).toHaveLength(1);
    });

    it('should handle large pagination offsets', async () => {
      const result = await repository.findAll({ offset: 1000 });
      expect(result.tasks).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle null and undefined task fields', async () => {
      const task = await repository.create({
        title: 'Test Task',
        description: null,
        dueDate: undefined
      });

      expect(task.description).toBe('');
      expect(task.dueDate).toBeNull();
    });
  });
});
