import React, { createContext, useContext, useReducer } from 'react';

// Action types
const ACTIONS = {
  // Loading states
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Tasks
  SET_TASKS: 'SET_TASKS',
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  DELETE_TASK: 'DELETE_TASK',
  
  // Filters and UI state
  SET_FILTERS: 'SET_FILTERS',
  SET_SEARCH: 'SET_SEARCH',
  SET_SORT: 'SET_SORT',
  
  // Statistics
  SET_STATS: 'SET_STATS',
  
  // UI state
  SET_SELECTED_TASK: 'SET_SELECTED_TASK',
  SET_MODAL_STATE: 'SET_MODAL_STATE'
};

// Initial state
const initialState = {
  // Task data
  tasks: [],
  stats: null,
  
  // Loading and error states
  loading: false,
  error: null,
  
  // Filters and search
  filters: {
    status: '',
    priority: '',
    tags: [],
    search: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    overdue: false
  },
  
  // Pagination
  pagination: {
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  },
  
  // UI state
  selectedTask: null,
  modal: {
    isOpen: false,
    type: null, // 'create', 'edit', 'delete'
    data: null
  }
};

// Reducer function with improved loading state management
function taskReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        // Don't clear error when starting to load, but clear it when loading stops
        error: action.payload ? state.error : null
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false, // Always clear loading when setting an error
        error: action.payload
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case ACTIONS.SET_TASKS:
      return {
        ...state,
        tasks: action.payload.tasks || [],
        pagination: action.payload.pagination || state.pagination,
        loading: false, // Always clear loading when tasks are set
        error: null
      };

    case ACTIONS.ADD_TASK:
      return {
        ...state,
        tasks: [action.payload, ...state.tasks],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1
        },
        loading: false // Clear loading after successful add
      };

    case ACTIONS.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
        selectedTask: state.selectedTask?.id === action.payload.id 
          ? action.payload 
          : state.selectedTask
      };

    case ACTIONS.DELETE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1)
        },
        selectedTask: state.selectedTask?.id === action.payload 
          ? null 
          : state.selectedTask
      };

    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        },
        pagination: {
          ...state.pagination,
          offset: 0 // Reset pagination when filters change
        }
      };

    case ACTIONS.SET_SEARCH:
      return {
        ...state,
        filters: {
          ...state.filters,
          search: action.payload
        },
        pagination: {
          ...state.pagination,
          offset: 0 // Reset pagination when search changes
        }
      };

    case ACTIONS.SET_SORT:
      return {
        ...state,
        filters: {
          ...state.filters,
          sortBy: action.payload.sortBy,
          sortOrder: action.payload.sortOrder
        }
      };

    case ACTIONS.SET_STATS:
      return {
        ...state,
        stats: action.payload
      };

    case ACTIONS.SET_SELECTED_TASK:
      return {
        ...state,
        selectedTask: action.payload
      };

    case ACTIONS.SET_MODAL_STATE:
      return {
        ...state,
        modal: {
          ...state.modal,
          ...action.payload
        }
      };

    default:
      console.warn(`Unhandled action type: ${action.type}`);
      return state;
  }
}

// Create contexts
const TaskContext = createContext();
const TaskDispatchContext = createContext();

// Context provider component
export function TaskProvider({ children }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // Debug logging for loading state changes
  React.useEffect(() => {
    console.log('Loading state changed:', state.loading);
  }, [state.loading]);

  return (
    <TaskContext.Provider value={state}>
      <TaskDispatchContext.Provider value={dispatch}>
        {children}
      </TaskDispatchContext.Provider>
    </TaskContext.Provider>
  );
}

// Custom hooks for using context
export function useTaskState() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskState must be used within a TaskProvider');
  }
  return context;
}

export function useTaskDispatch() {
  const context = useContext(TaskDispatchContext);
  if (!context) {
    throw new Error('useTaskDispatch must be used within a TaskProvider');
  }
  return context;
}

// Combined hook for convenience
export function useTasks() {
  return {
    state: useTaskState(),
    dispatch: useTaskDispatch()
  };
}

// Action creators for better developer experience
export const taskActions = {
  setLoading: (loading) => ({
    type: ACTIONS.SET_LOADING,
    payload: loading
  }),

  setError: (error) => ({
    type: ACTIONS.SET_ERROR,
    payload: error
  }),

  clearError: () => ({
    type: ACTIONS.CLEAR_ERROR
  }),

  setTasks: (data) => ({
    type: ACTIONS.SET_TASKS,
    payload: data
  }),

  addTask: (task) => ({
    type: ACTIONS.ADD_TASK,
    payload: task
  }),

  updateTask: (task) => ({
    type: ACTIONS.UPDATE_TASK,
    payload: task
  }),

  deleteTask: (taskId) => ({
    type: ACTIONS.DELETE_TASK,
    payload: taskId
  }),

  setFilters: (filters) => ({
    type: ACTIONS.SET_FILTERS,
    payload: filters
  }),

  setSearch: (search) => ({
    type: ACTIONS.SET_SEARCH,
    payload: search
  }),

  setSort: (sortBy, sortOrder) => ({
    type: ACTIONS.SET_SORT,
    payload: { sortBy, sortOrder }
  }),

  setStats: (stats) => ({
    type: ACTIONS.SET_STATS,
    payload: stats
  }),

  setSelectedTask: (task) => ({
    type: ACTIONS.SET_SELECTED_TASK,
    payload: task
  }),

  setModal: (modalState) => ({
    type: ACTIONS.SET_MODAL_STATE,
    payload: modalState
  })
};

export { ACTIONS };