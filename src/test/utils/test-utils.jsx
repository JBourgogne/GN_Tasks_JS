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