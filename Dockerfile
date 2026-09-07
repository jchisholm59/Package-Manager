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

# Install system tools and Node.js from Debian Testing repos
# This avoids the NodeSource script which can fail on "Testing" distros
RUN apt-get update && apt-get install -y \
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
    nodejs \
    npm \
    sudo \
    ca-certificates \
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
