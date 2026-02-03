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
│   │   ├── index.js                    # Slim entry point, loads modules
│   │   ├── index.test.js               # Integration tests
│   │   ├── lib/
│   │   │   ├── config.js               # Environment-based configuration
│   │   │   └── docker-client.js        # Docker client factory
│   │   └── modules/
│   │       ├── index.js                # Module registry & loader
│   │       ├── containers/             # Container management module
│   │       │   ├── index.js
│   │       │   ├── routes.js
│   │       │   ├── routes.test.js
│   │       │   └── container-service.js
│   │       ├── system/                 # System info module
│   │       │   ├── index.js
│   │       │   ├── routes.js
│   │       │   └── routes.test.js
│   │       ├── update-checker/         # Image update detection
│   │       │   ├── index.js
│   │       │   ├── update-checker.js
│   │       │   ├── update-checker.test.js
│   │       │   ├── registry-client.js
│   │       │   ├── registry-client.test.js
│   │       │   ├── image-parser.js
│   │       │   └── image-parser.test.js
│   │       ├── scheduler/              # Job scheduling
│   │       │   ├── index.js
│   │       │   ├── scheduler.js
│   │       │   └── scheduler.test.js
│   │       └── notifications/          # Notification providers
│   │           ├── index.js
│   │           ├── notification-manager.js
│   │           ├── notification-manager.test.js
│   │           └── providers/
│   │               ├── base-provider.js
│   │               └── discord/
│   │                   ├── discord-webhook.js
│   │                   ├── discord-webhook.test.js
│   │                   ├── discord-bot.js
│   │                   └── discord-bot.test.js
│   ├── package.json
│   └── vitest.config.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.test.jsx
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
│   └── build.yml
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

## Configuration

All configuration is done via environment variables. See `docker-compose.yml` for all available options.

### Update Checker Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `UPDATE_CHECKER_ENABLED` | `false` | Enable automatic update checking |
| `UPDATE_CHECKER_INTERVAL_MINUTES` | `60` | Check interval (minimum 5 minutes) |
| `UPDATE_CHECKER_CONTAINERS` | `*` | Containers to check (`*` for all, or comma-separated names) |
| `UPDATE_CHECKER_EXCLUDE_CONTAINERS` | | Containers to exclude (comma-separated names) |

### Discord Notification Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCORD_ENABLED` | `false` | Enable Discord notifications |
| `DISCORD_WEBHOOK_URL` | | Webhook URL for sending notifications |
| `DISCORD_BOT_TOKEN` | | Bot token for slash commands (optional) |
| `DISCORD_GUILD_ID` | | Server ID for registering commands |

### Registry Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `GHCR_TOKEN` | | GitHub Container Registry token (for private images) |

## Module Architecture

The backend uses a modular architecture where features can be enabled/disabled independently:

- **containers**: Container management API (always enabled)
- **system**: System info API (always enabled)
- **scheduler**: Job scheduling for periodic tasks
- **update-checker**: Detects when container images have updates
- **notifications**: Sends alerts via Discord webhooks/bot

Each module follows a consistent structure:
- `index.js` - Module entry point with `init()`, `registerRoutes()`, and `shutdown()` lifecycle methods
- `*.test.js` - Tests co-located with source files

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

### Enable Update Notifications

1. Create a Discord webhook in your server
2. Set environment variables:
```yaml
environment:
  - UPDATE_CHECKER_ENABLED=true
  - DISCORD_ENABLED=true
  - DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```
3. (Optional) Add a bot for `/check-updates` command:
```yaml
environment:
  - DISCORD_BOT_TOKEN=your-bot-token
  - DISCORD_GUILD_ID=your-server-id
```
