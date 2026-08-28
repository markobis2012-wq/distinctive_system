# Distinctive System

This repository contains the Go backend and Next.js frontend for the Distinctive System.

## Prerequisites
Before running this project on a new machine, ensure you have the following installed:
* [Git](https://git-scm.com/)
* [Go](https://go.dev/)
* [Node.js](https://nodejs.org/)
* MySQL Server / HeidiSQL (or XAMPP)

## Detailed Installation Guide (Windows)

If you are setting this up on a brand new laptop, follow these steps to install the required tools.

### 1. Install Git
Git is required to download your code from GitHub and push updates.
1. Go to [git-scm.com/download/win](https://git-scm.com/download/win).
2. Click **"64-bit Git for Windows Setup"** to download the installer.
3. Run the downloaded `.exe` file.
4. Keep clicking **Next** to accept all the default settings (the defaults are perfectly fine for this project) until it installs.
5. *Verify:* Open your terminal (Command Prompt or PowerShell) and type `git --version`. It should return the installed version.

### 2. Install Go (Golang)
Go is required to run the backend API.
1. Go to [go.dev/dl](https://go.dev/dl/).
2. Download the installer for Windows (look for the file ending in **`.msi`**, e.g., `go1.x.x.windows-amd64.msi`).
3. Run the installer and follow the standard prompts (Next -> Next -> Install).
4. *Verify:* Open a **new** terminal and type `go version`. It should output the Go version you just installed.

### 3. Install Node.js
Node.js is required to run the Next.js frontend and install JavaScript packages.
1. Go to [nodejs.org](https://nodejs.org/).
2. Click the download button for the **LTS (Long Term Support)** version. This is the most stable version.
3. Run the downloaded `.msi` installer.
4. Keep clicking **Next** to accept all defaults. Make sure the box that says "Automatically install the necessary tools" is *unchecked* (you don't need them for this project).
5. *Verify:* Open a terminal and type `node -v` and then `npm -v`. Both should return version numbers.

### 4. Install MySQL via XAMPP & HeidiSQL
The easiest way to run a local database on Windows is using XAMPP. HeidiSQL is used to view and manage that database.

**Part A: XAMPP (Runs the MySQL Database)**
1. Go to [apachefriends.org/download.html](https://www.apachefriends.org/download.html).
2. Download **XAMPP for Windows**.
3. Run the installer. When asked which components to install, you only need **MySQL** (you can uncheck FileZilla, Tomcat, Mercury, etc., but leaving them checked is fine too).
4. Finish the installation and open the **XAMPP Control Panel**.
5. Click the **Start** button next to **MySQL**. (It should turn green and show a port number, usually 3306).

**Part B: HeidiSQL (Views the Database)**
1. Go to [heidisql.com/download.php](https://www.heidisql.com/download.php).
2. Download the **Installer** and run it.
3. Open HeidiSQL and click **New** in the bottom left to create a new session.
4. Set it up as follows:
   * **Network type:** MariaDB or MySQL (TCP/IP)
   * **Hostname / IP:** `127.0.0.1`
   * **User:** `root`
   * **Password:** *(Leave this completely blank for a fresh XAMPP install)*
   * **Port:** `3306`
5. Click **Open** to connect to your database.

> **⚠️ Important Password Note for Local Dev:** 
> Because a fresh XAMPP install has a blank root password, your Go backend won't be able to connect if it's still looking for your work password. 
> 
> When testing at home, open `backend/cmd/api/main.go` and temporarily change your database connection string to have no password:
> `dsn := "root:@tcp(127.0.0.1:3306)/distinctive_new_db"`
> *(Just remember not to commit this password change to GitHub!)*

## Installation & Setup

### 1. Clone the Code
Open a terminal in the directory where you want the project to live and run:
\`\`\`bash
git clone https://github.com/markobis2012-wq/distinctive_system.git
cd distinctive_system
\`\`\`

### 2. Setup the Database
1. Open HeidiSQL (or your preferred SQL client).
2. Create a new blank database named `distinctive_new_db`.
3. Import your latest `distinctive_db_backup.sql` file to restore the tables and data.
4. *Note: If your local MySQL root password differs from the work PC, update the `dsn` connection string in your Go configuration file.*

### 3. Start the Backend
Open a terminal, navigate to the backend folder, install dependencies, and run the server:
\`\`\`bash
cd backend
go mod tidy
go run cmd/api/main.go
\`\`\`
*(Note: Upload folders like `supplier_product` and `company_attachments` are ignored by Git. The backend will automatically recreate them the first time you upload a file locally).*

### 4. Start the Frontend
Open a **second** terminal, navigate to the frontend folder, install dependencies, and start Next.js:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

---

## Daily Sync Workflow

**When leaving work (Pushing changes):**
\`\`\`bash
git add .
git commit -m "Update from work"
git push
\`\`\`
*Don't forget to export a fresh `.sql` database backup if you changed the table structures or added important data!*

**When starting at home (Pulling changes):**
\`\`\`bash
git pull
\`\`\`