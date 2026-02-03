# Docker Monitor

A web application for monitoring and managing Docker containers.

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

The application will be available at `http://localhost:3001`.

### Manual Setup

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuration

Configuration is done via environment variables. See `docker-compose.yml` for all available options.

### Update Notifications (Optional)

Enable automatic update checking and Discord notifications:

```yaml
environment:
  - UPDATE_CHECKER_ENABLED=true
  - UPDATE_CHECKER_INTERVAL_MINUTES=60
  - DISCORD_ENABLED=true
  - DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Running Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```
