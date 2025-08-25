// vite.config.js - Update your existing config
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.config.ts'
      ]
    }
  }
})

// ===== src/test/setup.js =====
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// ===== src/test/utils/test-utils.jsx =====
import React from 'react'
import { render } from '@testing-library/react'
import { TaskProvider } from '../../context/TaskContext.jsx'

// Custom render function that includes providers
function customRender(ui, options = {}) {
  const { 
    initialState = {},
    ...renderOptions 
  } = options

  function Wrapper({ children }) {
    return (
      <TaskProvider initialState={initialState}>
        {children}
      </TaskProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

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

// ===== package.json updates (add these to your existing package.json) =====
/*
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.2",
    "@vitest/coverage-v8": "^1.0.4",
    "@vitest/ui": "^1.0.4",
    "jsdom": "^23.0.1",
    "vitest": "^1.0.4"
  }
}
*/