Initial Project Setup

Folder Structure:

Github Repository Setup:

Run "git init" under main directory

Navigate to backend/ and run "npm init -y"

Add following to backend package.json:
{
  "name": "task-management-backend",
  "version": "1.0.0",
  "description": "Task Management API Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "keywords": ["task-management", "api", "express"],
  "author": "Jake Bourgogne",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "joi": "^17.11.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.53.0"
  },
  "jest": {
    "testEnvironment": "node",
    "collectCoverageFrom": [
      "**/*.js",
      "!node_modules/**",
      "!coverage/**"
    ]
  }
}

Create Frontend with React basics:
npx create-react-app . --template minimal

Create Directory Structure
