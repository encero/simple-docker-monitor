# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend and create final image
FROM node:20-alpine AS production

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies (production only)
WORKDIR /app/backend
RUN npm install --production

# Copy backend source
COPY backend/src ./src

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set working directory back to backend
WORKDIR /app/backend

# Expose the port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Run the application
CMD ["node", "src/index.js"]
