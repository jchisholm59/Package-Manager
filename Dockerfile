# Build Frontend
FROM node:18-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Final Image - Explicitly Trixie
FROM debian:trixie-slim
WORKDIR /app

# Install Node.js and the modern Trixie security stack (sqv/sequoia)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
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
    sqv \
    sequoia-utils \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set up locales
RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LC_ALL en_US.UTF-8

COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8300
WORKDIR /app/backend
CMD ["node", "server.js"]
