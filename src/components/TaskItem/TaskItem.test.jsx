// ===== src/components/TaskItem/TaskItem.test.jsx =====
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import TaskItem from './TaskItem'
import { mockTasks } from '../../test/mocks/api'

describe('TaskItem', () => {
  const defaultProps = {
    task: mockTasks[0],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
    onSelect: vi.fn(),
    isSelected: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders task information correctly', () => {
    render(<TaskItem {...defaultProps} />)
    
    expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('todo')).toBeInTheDocument()
  })

  it('displays tags when present', () => {
    render(<TaskItem {...defaultProps} />)
    
    expect(screen.getByText('#test')).toBeInTheDocument()
    expect(screen.getByText('#frontend')).toBeInTheDocument()
  })

  it('shows overdue indicator for overdue tasks', () => {
    const overdueTask = {
      ...mockTasks[0],
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'todo'
    }

    render(<TaskItem {...defaultProps} task={overdueTask} />)
    
    expect(screen.getByText('(Overdue)')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskItem {...defaultProps} />)
    
    const editButton = screen.getByLabelText('Edit task')
    await user.click(editButton)
    
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockTasks[0])
  })

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskItem {...defaultProps} />)
    
    const deleteButton = screen.getByLabelText('Delete task')
    await user.click(deleteButton)
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockTasks[0])
  })

  it('shows appropriate status change buttons', () => {
    render(<TaskItem {...defaultProps} />)
    
    // Todo task should show Start button
    expect(screen.getByText('▶️ Start')).toBeInTheDocument()
  })

  it('handles status change from todo to in_progress', async () => {
    const user = userEvent.setup()
    render(<TaskItem {...defaultProps} />)
    
    const startButton = screen.getByText('▶️ Start')
    await user.click(startButton)
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('1', 'in_progress')
  })

  it('applies selected styling when isSelected is true', () => {
    render(<TaskItem {...defaultProps} isSelected={true} />)
    
    const taskItem = screen.getByRole('button', { name: /test task 1/i }).closest('.task-item')
    expect(taskItem).toHaveClass('selected')
  })
})

// ===== src/components/TaskForm/TaskForm.test.jsx =====
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import TaskForm from './TaskForm'
import { mockTasks } from '../../test/mocks/api'

describe('TaskForm', () => {
  const defaultProps = {
    mode: 'create',
    task: null,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    error: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create form correctly', () => {
    render(<TaskForm {...defaultProps} />)
    
    expect(screen.getByText('✨ Create New Task')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByText('Create Task')).toBeInTheDocument()
  })

  it('renders edit form correctly', () => {
    const editProps = {
      ...defaultProps,
      mode: 'edit',
      task: mockTasks[0]
    }
    
    render(<TaskForm {...editProps} />)
    
    expect(screen.getByText('✏️ Edit Task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Task 1')).toBeInTheDocument()
    expect(screen.getByText('Update Task')).toBeInTheDocument()
  })

  it('validates required title field', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)
    
    const submitButton = screen.getByText('Create Task')
    await user.click(submitButton)
    
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('validates title length limit', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'a'.repeat(101))
    
    const submitButton = screen.getByText('Create Task')
    await user.click(submitButton)
    
    expect(screen.getByText('Title must be 100 characters or less')).toBeInTheDocument()
  })

  it('handles tag input correctly', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)
    
    const tagInput = screen.getByLabelText(/tags/i)
    await user.type(tagInput, 'test-tag{enter}')
    
    expect(screen.getByText('#test-tag')).toBeInTheDocument()
  })

  it('removes tags when remove button is clicked', async () => {
    const user = userEvent.setup()
    const taskWithTags = {
      ...mockTasks[0],
      tags: ['existing-tag']
    }
    
    render(<TaskForm {...defaultProps} mode="edit" task={taskWithTags} />)
    
    const removeButton = screen.getByLabelText('Remove existing-tag tag')
    await user.click(removeButton)
    
    expect(screen.queryByText('#existing-tag')).not.toBeInTheDocument()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)
    
    await user.type(screen.getByLabelText(/title/i), 'New Task')
    await user.type(screen.getByLabelText(/description/i), 'Task description')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'high')
    
    const submitButton = screen.getByText('Create Task')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'Task description',
        status: 'todo',
        priority: 'high',
        dueDate: null,
        tags: []
      })
    })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('shows loading state correctly', () => {
    render(<TaskForm {...defaultProps} loading={true} />)
    
    expect(screen.getByText('Creating...')).toBeInTheDocument()
    expect(screen.getByText('Creating...')).toBeDisabled()
  })

  it('displays error message when provided', () => {
    render(<TaskForm {...defaultProps} error="Something went wrong" />)
    
    expect(screen.getByText('❌ Something went wrong')).toBeInTheDocument()
  })
})

// ===== src/components/TaskList/TaskList.test.jsx =====
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import TaskList from './TaskList'
import { mockTasks } from '../../test/mocks/api'

describe('TaskList', () => {
  const defaultProps = {
    tasks: mockTasks,
    loading: false,
    error: null,
    onTaskEdit: vi.fn(),
    onTaskDelete: vi.fn(),
    onTaskStatusChange: vi.fn(),
    onTaskSelect: vi.fn(),
    selectedTaskId: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all tasks grouped by status', () => {
    render(<TaskList {...defaultProps} />)
    
    expect(screen.getByText('📋 To Do (1)')).toBeInTheDocument()
    expect(screen.getByText('🔄 In Progress (1)')).toBeInTheDocument()
    expect(screen.getByText('✅ Completed (1)')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<TaskList {...defaultProps} tasks={[]} loading={true} />)
    
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    render(<TaskList {...defaultProps} tasks={[]} />)
    
    expect(screen.getByText('No Tasks Yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first task to get started!')).toBeInTheDocument()
  })

  it('shows custom empty message', () => {
    render(<TaskList {...defaultProps} tasks={[]} emptyStateMessage="No matching tasks" />)
    
    expect(screen.getByText('No matching tasks')).toBeInTheDocument()
  })

  it('handles sort button clicks', async () => {
    const user = userEvent.setup()
    render(<TaskList {...defaultProps} />)
    
    const prioritySort = screen.getByText(/Priority/i)
    await user.click(prioritySort)
    
    // Verify UI updates (priority button should be active)
    expect(prioritySort).toHaveClass('active')
  })

  it('passes correct props to TaskItem components', () => {
    render(<TaskList {...defaultProps} selectedTaskId="1" />)
    
    // Check if first task is marked as selected
    const taskItems = screen.getAllByRole('button')
    expect(taskItems[0]).toHaveClass('selected')
  })
})

// ===== src/hooks/useTasks.test.js =====
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { TaskProvider } from '../../context/TaskContext'
import { useTasks } from './useTasks'
import { mockTasks, mockStats, mockFetch } from '../../test/mocks/api'

// Mock the API module
vi.mock('../../utils/api', () => ({
  tasksAPI: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getStats: vi.fn()
  }
}))

describe('useTasks hook', () => {
  const wrapper = ({ children }) => (
    <TaskProvider>{children}</TaskProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useTasks(), { wrapper })
    
    expect(result.current.tasks).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.stats).toBe(null)
  })

  it('loads tasks successfully', async () => {
    global.fetch.mockImplementation(() => 
      mockFetch({ success: true, data: { tasks: mockTasks } })
    )

    const { result } = renderHook(() => useTasks(), { wrapper })
    
    await act(async () => {
      await result.current.loadTasks()
    })

    expect(result.current.tasks).toEqual(mockTasks)
    expect(result.current.loading).toBe(false)
  })

  it('handles task creation', async () => {
    global.fetch.mockImplementation(() => 
      mockFetch({ success: true, data: { task: mockTasks[0] } })
    )

    const { result } = renderHook(() => useTasks(), { wrapper })
    
    await act(async () => {
      await result.current.createTask({
        title: 'New Task',
        description: 'Description'
      })
    })

    expect(result.current.tasks).toContain(mockTasks[0])
  })
})