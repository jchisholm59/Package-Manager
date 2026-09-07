# Linux Package Manager Web UI

A modern, full-stack web application for managing Debian-based (`.deb`) systems. This tool provides a graphical interface to search, install, remove, and update packages, as well as perform system maintenance tasks.

## 🚀 Features

- **Search & Discover**: Real-time search of available packages in the repositories.
- **Package Management**: Install and remove packages with a simple web interface.
- **Updates**: Check for upgradable packages and apply updates (individually or all).
- **Maintenance**: Fix broken installs and check for distribution release updates.
- **Theming**: Modern UI with Light, Dark, and **Dark Slate Grey** (default) themes.
- **Docker Support**: Easy deployment using containerization.

---

## ⚠️ Security Warnings

> [!CAUTION]
> **Privileged Access**: This application requires `root` or `sudo` privileges to modify system packages. Exposing this application to a public network without authentication is extremely dangerous as it allows full system control.
>
> **Input Validation**: While the app uses basic sanitization, running system commands via a web API is a potential security risk. Use this tool only in trusted, isolated environments.

---

## 🛠 Deployment Options

### Option 1: Docker (Recommended)
Docker isolates the application and provides all necessary dependencies.

1. **Build and Start**:
   ```bash
   docker-compose up --build
   ```
2. **Access**: Open [http://localhost:8300](http://localhost:8300).
3. **Host Management Mode**: The `docker-compose.yml` is pre-configured to mount the host's package databases. This allows the container to manage the actual packages on your physical machine. If you only want to manage the container's internal packages, remove the `volumes` section from `docker-compose.yml`.

### Option 2: PM2 (Standard Node.js Instance)
Use PM2 to run the application as a background service on your Linux host.

1. **Prerequisites**:
   ```bash
   # Install PM2 globally
   sudo npm install -g pm2
   ```
2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   ```
3. **Run as Root (Easiest for Permissions)**:
   ```bash
   sudo pm2 start server.js --name "package-manager"
   ```
4. **Run as Normal User (More Secure)**:
   If running as a normal user, you must grant the user passwordless `sudo` for `apt` commands:
   - Run `sudo visudo`.
   - Add this line at the end (replace `your-user` with your username):
     ```text
     your-user ALL=(ALL) NOPASSWD: /usr/bin/apt-get, /usr/bin/apt-cache, /usr/bin/dpkg, /usr/bin/dpkg-query, /usr/bin/apt
     ```
   - Then start normally:
     ```bash
     pm2 start server.js --name "package-manager"
     ```

---

## 📂 Project Structure

- `backend/`: Node.js Express server on port 8300.
- `frontend/`: React + Tailwind CSS frontend.
- `Dockerfile`: Multi-stage build for the application.
- `docker-compose.yml`: Container orchestration.

## 📜 License
MIT

---

## 💡 Pro-Tip: Stop Git Password Prompts
If you are tired of entering your GitHub token every time you `git pull`, run this command to store your credentials locally:

```bash
git config --global credential.helper store
```
*The next time you pull, enter your username and token once. Git will remember them for all future operations.*
