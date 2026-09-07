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
RUN apt-get update && apt-get install -y \
    apt \
    dpkg \
    sudo \
    ca-certificates \
    gnupg \
    apt-listchanges \
    apt-utils \
    whiptail \
    dialog \
    locales \
    libterm-readline-gnu-perl \
    && rm -rf /var/lib/apt/lists/*

# Set up locales to prevent dpkg crashes
RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Copy frontend build to backend/dist
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8300
WORKDIR /app/backend
CMD ["node", "server.js"]
