# Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Final Image - Match Host (Trixie)
FROM debian:testing-slim
WORKDIR /app

# Set environment to non-interactive
ENV DEBIAN_FRONTEND=noninteractive

# 1. Update and install basic certificates/tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Node.js directly from the official NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 3. Install the specific system management tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt \
    dpkg \
    apt-utils \
    apt-listchanges \
    whiptail \
    dialog \
    locales \
    libterm-readline-gnu-perl \
    procps \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Set up locales
RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
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
