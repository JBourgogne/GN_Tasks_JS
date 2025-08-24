import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [tasks, setTasks] = useState([]);

  // Test backend connection - works both locally and on Vercel
  useEffect(() => {
    const testBackend = async () => {
      try {
        // Use relative URLs that work in both dev and production
        const response = await fetch('/api/health');
        const data = await response.json();
        setBackendStatus(`✅ Backend connected - ${data.status}`);
        
        // Fetch sample tasks
        const tasksResponse = await fetch('/api/tasks');
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
      } catch (error) {
        setBackendStatus('❌ Backend connection failed');
        console.error('Backend connection error:', error);
      }
    };

    testBackend();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Task Management App</h1>
        <p>Full-stack React + Express application</p>
        
        <div className="status-section">
          <h3>System Status</h3>
          <p>Frontend: ✅ React + Vite running</p>
          <p>Backend: {backendStatus}</p>
          <p>Environment: {import.meta.env.MODE}</p>
        </div>

        <div className="tasks-section">
          <h3>Sample Tasks</h3>
          {tasks.length > 0 ? (
            <ul>
              {tasks.map(task => (
                <li key={task.id}>
                  {task.title} - <span className={`status ${task.status}`}>{task.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No tasks loaded yet...</p>
          )}
        </div>

        <div className="deployment-info">
          <h3>🚀 Deployed on Vercel</h3>
          <p>This app is running on Vercel's serverless platform</p>
        </div>

        <div className="tech-stack">
          <h3>Tech Stack</h3>
          <ul>
            <li>⚛️ React 18</li>
            <li>⚡ Vite</li>
            <li>🔥 Vercel Functions</li>
            <li>🧪 Vitest</li>
            <li>📡 React Query (ready)</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;

export default App;