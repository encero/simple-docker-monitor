# Docker Monitor - Development Guide

## Project Overview

Docker Monitor is a full-stack web application for managing and monitoring Docker containers. It consists of:
- **Backend**: Express.js API server with Dockerode for Docker interaction
- **Frontend**: React 18 + Vite single-page application

## Project Structure

```
simple-docker-monitor/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server and API routes
│   │   └── index.test.js     # Backend API tests
│   ├── package.json
│   └── vitest.config.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── App.test.jsx      # App component tests
│   │   └── components/
│   │       ├── ContainerCard.jsx
│   │       ├── ContainerCard.test.jsx
│   │       ├── LogsModal.jsx
│   │       ├── LogsModal.test.jsx
│   │       ├── Toast.jsx
│   │       └── Toast.test.jsx
│   ├── package.json
│   └── vite.config.js
├── .github/workflows/
│   └── build.yml             # CI/CD pipeline with tests
├── Dockerfile
└── docker-compose.yml
```

## Development Commands

### Backend

```bash
cd backend

# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Testing Requirements

**IMPORTANT**: Always run tests before committing changes.

### Run All Tests

```bash
# From project root
cd backend && npm test && cd ../frontend && npm test
```

### Test Coverage

Tests use Vitest as the test runner:
- Backend tests mock the Docker client to test API endpoints
- Frontend tests use React Testing Library with jsdom environment

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/containers` | GET | List all containers |
| `/api/containers/:id` | GET | Get container details |
| `/api/containers/:id/start` | POST | Start a container |
| `/api/containers/:id/stop` | POST | Stop a container |
| `/api/containers/:id/restart` | POST | Restart a container |
| `/api/containers/:id/upgrade` | POST | Pull latest image and recreate |
| `/api/containers/:id/logs` | GET | Get container logs |
| `/api/system/info` | GET | Get Docker system info |

## CI/CD Pipeline

The GitHub Actions workflow (`build.yml`) runs:
1. **Test job**: Installs dependencies and runs all tests
2. **Build job**: Builds and pushes Docker image (only after tests pass)

## Docker

### Build locally
```bash
docker build -t docker-monitor .
```

### Run with docker-compose
```bash
docker-compose up -d
```

The application runs on port 3001.
