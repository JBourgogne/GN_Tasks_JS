# Task Management System

A full-stack task management application built with modern web development practices, featuring a React frontend and Node.js/Express API backend with advanced filtering, real-time analytics, and responsive design.

## 🚀 Live Demo

**Frontend:** [https://gn-tasks-js.vercel.app/](https://gn-tasks-js.vercel.app/  
**API Health Check:** [https://gn-tasks-js.vercel.app/api](https://gn-tasks-js.vercel.app/api)

## ✨ Features

### Core Functionality
- ✅ **Full CRUD Operations** - Create, read, update, and delete tasks
- 🔍 **Advanced Search & Filtering** - Filter by status, priority, tags, and text search
- 📊 **Real-time Analytics Dashboard** - Task statistics, completion rates, and productivity insights
- 🏷️ **Tag Management** - Organize tasks with custom tags
- ⚡ **Smart Sorting** - Sort by priority, due date, creation time, or title
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices

### Advanced Features
- 🎯 **Overdue Task Detection** - Automatic identification of overdue items
- 📈 **Productivity Scoring** - AI-driven productivity insights and recommendations
- ⚡ **Real-time Updates** - Optimistic updates for instant user feedback
- 🔄 **Auto-refresh** - Periodic statistics updates
- 📊 **Interactive Dashboard** - Clickable metrics for instant filtering

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Joi** - Input validation
- **UUID** - Unique ID generation
- **Vercel Serverless Functions** - Scalable backend deployment

### Frontend
- **React 18** - UI framework with latest features
- **Context API** - State management
- **Custom Hooks** - Reusable logic patterns
- **CSS3** - Modern styling with responsive design
- **Vite** - Fast development build tool

### Development & Testing
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing utilities
- **ESLint** - Code linting and quality assurance
- **Prettier** - Code formatting

### Deployment & Infrastructure
- **Vercel** - Full-stack deployment platform
- **GitHub** - Source code management
- **In-Memory Storage** - Fast task storage with repository pattern

## 📋 API Documentation

### Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://gn-tasks-js.vercel.app/api`

### Endpoints

#### Health Check
```http
GET /api/
GET /api/health
```
Returns system health information and database connection status.

#### Tasks

**Get All Tasks**
```http
GET /api/tasks?status=todo&priority=high&search=project&sortBy=priority&sortOrder=desc&limit=50&offset=0&overdue=true&tags=frontend,urgent
```

Query Parameters:
- `status` (optional): `todo`, `in_progress`, `completed`
- `priority` (optional): `low`, `medium`, `high`
- `search` (optional): Text search in title and description
- `tags` (optional): Comma-separated tag list
- `overdue` (optional): `true` to show only overdue tasks
- `sortBy` (optional): `title`, `priority`, `createdAt`, `updatedAt`, `dueDate`
- `sortOrder` (optional): `asc`, `desc` (default: `desc`)
- `limit` (optional): 1-100 (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Get Single Task**
```http
GET /api/tasks/{id}
```

**Create Task**
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Complete project documentation",
  "description": "Write comprehensive README and API docs",
  "status": "todo",
  "priority": "high",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "tags": ["documentation", "high-priority"]
}
```

**Update Task**
```http
PUT /api/tasks/{id}
Content-Type: application/json

{
  "status": "completed",
  "priority": "medium"
}
```

**Delete Task**
```http
DELETE /api/tasks/{id}
```

**Get Statistics**
```http
GET /api/tasks/stats
```

Returns comprehensive analytics including task counts by status/priority, completion rates, overdue items, and trending tags.

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "task": { /* task object */ },
    "message": "Task created successfully"
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "abc123",
    "method": "POST",
    "endpoint": "/api/tasks"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Task validation failed",
    "statusCode": 400,
    "type": "validation_error",
    "details": {
      "errors": [
        {
          "field": "title",
          "message": "Title is required",
          "value": ""
        }
      ]
    }
  }
}
```

### Task Data Model

```javascript
{
  id: string (UUID),           // Auto-generated unique identifier
  title: string (1-100 chars), // Required task title
  description: string (0-500), // Optional task description
  status: "todo" | "in_progress" | "completed",
  priority: "low" | "medium" | "high",
  dueDate: string (ISO) | null, // Optional due date
  tags: string[],              // Array of tags (max 10, alphanumeric + hyphens/underscores)
  createdAt: string (ISO),     // Auto-generated creation timestamp
  updatedAt: string (ISO)      // Auto-updated modification timestamp
}
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** for version control

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/JBourgogne/GN_Tasks_JS.git
   cd GN_Tasks_JS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Health Check: http://localhost:3000/api

### Testing

**Run all tests:**
```bash
npm run test:all
```

**Run specific test suites:**
```bash
# Frontend component tests
npm run test:frontend

# Backend API tests
npm run test:backend

# Integration tests
npm run test:integration

# Watch mode for development
npm test
```

**Test coverage:**
```bash
npm run test:coverage
```

### Code Quality

**Linting:**
```bash
npm run lint          # Check for issues
npm run lint:fix      # Fix auto-fixable issues
```

**Formatting:**
```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

**Type checking:**
```bash
npm run type-check
```

## 📦 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy to staging
   vercel

   # Deploy to production
   vercel --prod
   ```

2. **Environment Variables**
   No environment variables required for basic setup. The app uses Vercel's built-in serverless functions.

3. **Custom Domain (Optional)**
   Configure custom domain in Vercel dashboard.

### Alternative Deployment Options

**Railway:**
**Netlify:**

## 🏗️ Architecture Overview

### Project Structure
```
task-management-app/
├── api/                          # Backend serverless functions
│   ├── data/
│   │   └── TaskRepository.js     # Data access layer with repository pattern
│   ├── middleware/
│   │   ├── cors.js               # CORS handling
│   │   ├── errorHandler.js       # Global error management
│   │   ├── logger.js             # Request/response logging
│   │   └── security.js           # Security headers and input sanitization
│   ├── validation/
│   │   └── schemas.js            # Joi validation schemas
│   └── index.js                  # Main API handler (serverless entry point)
├── src/                          # Frontend React application
│   ├── components/
│   │   ├── Dashboard/            # Analytics dashboard
│   │   ├── FilterBar/            # Advanced filtering interface
│   │   ├── TaskForm/             # Task creation/editing forms
│   │   ├── TaskItem/             # Individual task display
│   │   └── TaskList/             # Task listing with grouping
│   ├── context/
│   │   └── TaskContext.jsx       # Global state management
│   ├── hooks/
│   │   ├── useApi.js             # Generic API interaction hooks
│   │   └── useTasks.js           # Task-specific business logic
│   ├── utils/
│   │   └── api.js                # API client and utilities
│   └── App.jsx                   # Main application component
├── public/                       # Static assets
├── vercel.json                   # Vercel deployment configuration
├── vite.config.js                # Vite build configuration
└── package.json                  # Dependencies and scripts
```

### Design Patterns

**Repository Pattern (Backend)**
- `TaskRepository` abstracts data storage implementation
- Easy to switch from in-memory to database storage
- Includes advanced indexing for fast filtering operations

**Context + Custom Hooks Pattern (Frontend)**
- `TaskContext` provides global state management
- `useTasks` hook encapsulates all task-related business logic
- `useApi` hook handles generic API interactions with error handling

**Component Composition**
- Small, focused components with single responsibilities
- Props drilling avoided through context
- Reusable UI patterns across components

### Data Flow

1. **User Action** → Component event handler
2. **Component** → Custom hook (useTasks)
3. **Hook** → API utility function
4. **API** → Serverless function
5. **Function** → Repository layer
6. **Repository** → In-memory data structure
7. **Response** ← Repository returns data
8. **Hook** ← API returns formatted response
9. **Context** ← Hook updates global state
10. **UI** ← Components re-render with new data

### State Management Strategy

**Global State (TaskContext):**
- Task list and metadata
- Filter and search state
- Loading and error states
- Selected task and UI state

**Local State (Component):**
- Form inputs and validation
- UI animations and interactions
- Temporary display state

**Server State:**
- Tasks and statistics
- Managed through custom hooks
- Optimistic updates for better UX

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with HMR
npm run vercel:dev       # Run with Vercel CLI for serverless testing

# Building
npm run build            # Build for production
npm run preview          # Preview production build locally
npm run analyze          # Bundle size analysis

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:ui          # Interactive test UI
npm run test:coverage    # Generate coverage report

# Deployment
npm run vercel:deploy:staging  # Deploy to staging
npm run vercel:deploy:prod     # Deploy to production
```

### Key Development Features

**Hot Module Replacement (HMR)**
- Instant updates during development
- State preservation across code changes

**Advanced Error Boundaries**
- Graceful error handling in React components
- Detailed error reporting in development

**Optimistic Updates**
- Immediate UI feedback for user actions
- Automatic rollback on API failures

**Debounced Search**
- Efficient API calls during user input
- Configurable debounce timing

### Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## 📊 Performance

### Optimization Features

**Frontend:**
- Component-level code splitting
- Lazy loading for non-critical components
- Optimized re-rendering with React.memo
- Efficient state updates with useCallback/useMemo

**Backend:**
- In-memory caching with optimized data structures
- Request debouncing and throttling
- Efficient pagination and filtering
- Minimal API payload sizes

## 🔒 Security

### Implemented Security Measures

**Backend:**
- Input validation and sanitization
- CORS configuration
- Rate limiting (configurable)
- Security headers (CSP, XSS protection)
- SQL injection prevention (parameterized queries ready)

**Frontend:**
- XSS prevention through React's built-in protections
- CSRF protection through SameSite cookies
- Secure API communication
- Input sanitization on forms

### Development Guidelines

- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation for API changes
- Use semantic commit messages
- Ensure responsive design for new UI components

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

### Common Issues

**Backend not starting?**
- Check Node.js version (18.0.0+)
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Frontend not connecting to API?**
- Verify API is running on correct port
- Check CORS configuration in `api/middleware/cors.js`
- Inspect browser network tab for API errors

**Tests failing?**
- Update test snapshots: `npm run test -- --update-snapshots`
- Clear Jest cache: `npx jest --clearCache`

## 🚀 Roadmap

### Planned Features

**v2.0 - Database Integration**
- [ ] PostgreSQL/MongoDB support
- [ ] User authentication and authorization
- [ ] Multi-user task assignment
- [ ] Real-time collaboration

**v2.1 - Advanced Features**
- [ ] File attachments for tasks
- [ ] Task templates and recurring tasks
- [ ] Advanced reporting and export
- [ ] Mobile app (React Native)

**v2.2 - Enterprise Features**
- [ ] Team management
- [ ] Project organization
- [ ] Advanced analytics and insights
- [ ] API rate limiting and quotas

## 📈 Analytics

The application includes built-in analytics for task management insights:

- **Completion Rates:** Track your productivity over time
- **Priority Distribution:** Understand your task prioritization patterns  
- **Tag Trends:** See which categories consume most of your time
- **Overdue Analysis:** Get insights on deadline management
- **Daily/Weekly Summaries:** Monitor progress patterns
