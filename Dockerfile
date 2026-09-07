# Build Frontend
FROM node:18-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Final Image
FROM node:18-slim
WORKDIR /app

# Install system dependencies
# Note: ca-certificates is required for HTTPS repositories
# Note: apt-listchanges is often required when mounting host /etc/apt
RUN apt-get update && apt-get install -y \
    apt \
    dpkg \
    sudo \
    ca-certificates \
    gnupg \
    apt-listchanges \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Copy frontend build to backend/dist
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8300
WORKDIR /app/backend
CMD ["node", "server.js"]
