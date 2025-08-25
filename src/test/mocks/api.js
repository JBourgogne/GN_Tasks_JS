// ===== src/test/mocks/api.js =====
export const mockTasks = [
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
  },
  {
    id: '3',
    title: 'Completed Task',
    description: 'This is done',
    status: 'completed',
    priority: 'low',
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const mockStats = {
  total: 3,
  byStatus: {
    todo: 1,
    in_progress: 1,
    completed: 1
  },
  byPriority: {
    low: 1,
    medium: 1,
    high: 1
  },
  overdue: 0,
  completedToday: 1,
  tags: {
    total: 3,
    popular: [
      { tag: 'test', count: 1 },
      { tag: 'frontend', count: 1 },
      { tag: 'backend', count: 1 }
    ]
  },
  completion: {
    rate: 33
  }
}

// Mock fetch for API calls
export const mockFetch = (response, options = {}) => {
  const { ok = true, status = 200, delay = 0 } = options
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok,
        status,
        json: () => Promise.resolve(response)
      })
    }, delay)
  })
}