# Hostinger Web Hosting Deployment Guide for DE E-Learn

This guide provides step-by-step instructions for deploying the **DE E-Learn Platform** (Node.js + Express backend, MySQL database, and Next.js frontend) to Hostinger Web Hosting (cPanel / hPanel).

---

## Prerequisites
1. Hostinger Hosting plan with **Node.js support** (e.g. Business Web Hosting, Cloud Hosting, or VPS).
2. Domain connected to your Hostinger account.
3. Access to Hostinger **hPanel**.

---

## Step 1: Create the MySQL Database on Hostinger
1. Log in to your **Hostinger hPanel**.
2. Navigate to **Databases** → **MySQL Databases**.
3. Create a new database:
   - **Database Name**: e.g. `de_elearn` (Hostinger will prefix it with your username, e.g. `u123456789_de_elearn`).
   - **Database Username**: e.g. `u123456789_deadmin`.
   - **Password**: Choose a strong password and save it securely.
4. Click **Create**.

---

## Step 2: Import Database Schema & Seeds via phpMyAdmin
1. In Hostinger hPanel under **MySQL Databases**, locate your newly created database and click **Enter phpMyAdmin**.
2. Select your database from the left sidebar.
3. Click the **Import** tab in the top navigation bar.
4. Click **Choose File** and select `server/database/schema.sql` from this project.
5. Click **Go** / **Import** at the bottom.
6. Once the schema tables are created, click the **Import** tab again.
7. Click **Choose File** and select `server/database/seed.sql` from this project.
8. Click **Go** / **Import**.
9. Your branches, semesters, regulations, subjects, 33 faculty members, and test accounts are now populated!

---

## Step 3: Configure Node.js Application on Hostinger
1. In Hostinger hPanel, search for **Node.js** or go to **Advanced** → **Node.js**.
2. Click **Create Application**:
   - **Node.js version**: Choose `20.x` or `22.x`.
   - **Application mode**: `Production`.
   - **Application root**: Select or enter your domain directory (e.g. `public_html`).
   - **Application startup file**: `server/index.js` (or `server.js`).
3. Click **Create**.

---

## Step 4: Upload Project Files & Environment Variables
1. Build the frontend locally or via Git:
   ```bash
   npm run build
   ```
2. Upload the project files to your domain directory (`public_html`) on Hostinger using **Git Deploy**, **SSH**, or **File Manager**.
   > **Note**: Exclude `node_modules` from zip uploads; install them directly on the server.
3. In Hostinger File Manager, create `.env` in the application root with your production credentials:
   ```env
   # Hostinger Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=u123456789_deadmin
   DB_PASSWORD=YourDatabasePassword
   DB_NAME=u123456789_de_elearn

   # Application Port & Mode
   PORT=5000
   NODE_ENV=production
   SERVE_NEXTJS=true

   # Security
   JWT_SECRET=generate_a_random_64_character_secret_here
   JWT_EXPIRES_IN=7d
   ```

---

## Step 5: Fix File & Directory Permissions
On Linux/Hostinger servers, the build user needs read and execute permissions across all source folders (especially `/app`, `/app/api`, `/components`, `/lib`):
1. In Hostinger **SSH Terminal** (or File Manager permission manager), navigate to your app directory and run:
   ```bash
   # Set directory permissions to 755 (read, write, execute for owner; read, execute for others)
   find . -type d -exec chmod 755 {} +

   # Set file permissions to 644 (read, write for owner; read for others)
   find . -type f -exec chmod 644 {} +

   # Ensure server upload directory has full read/write access
   mkdir -p server/uploads/materials
   chmod -R 775 server/uploads
   ```

---

## Step 6: Install Dependencies & Run Build on Hostinger
1. In Hostinger hPanel Node.js manager or SSH terminal:
   ```bash
   # Install dependencies
   npm install

   # Run Next.js production build
   npm run build
   ```
2. In Hostinger Node.js Application manager, click **Restart Application**.

---

## Step 7: Verify Deployment
1. Visit `https://yourdomain.com/api/health` to confirm the Express API and MySQL connection are healthy:
   ```json
   {
     "status": "ok",
     "service": "DE E-Learn Node.js/Express API",
     "database": "MySQL"
   }
   ```
2. Visit `https://yourdomain.com/login` and sign in with the system administrator account:
   - **Email**: `admin@mvgrce.edu.in`
   - **Password**: `AdminPassword@123!`
3. Test uploading a file as faculty, downloading as student, and viewing analytics in the admin console.

---

## Troubleshooting Build & Permission Errors

### Error: `Permission denied / scandir /app/api/auth`
- **Cause**: The Hostinger build runner does not have read access to the directory, or an empty subfolder was present.
- **Fix**:
  1. Ensure no empty folders exist under `/app/api/` (stale/empty directories have been cleaned up).
  2. Run `chmod -R 755 app/` and `chmod -R 644 app/**/*` in your project root on the server.
  3. Re-trigger the build via Hostinger hPanel or run `npm run build`.
