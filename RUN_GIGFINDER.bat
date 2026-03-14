@echo off
color 0B
echo =======================================================
echo        🎸 GigFinder - One-Click Start Script 🎸
echo =======================================================
echo.

:: Step 1: Check for .env file
IF NOT EXIST "server\.env" (
    color 0C
    echo [ERROR] The server/.env file is missing!
    echo.
    echo Lecturer, please create a file named ".env" inside the "server" folder.
    echo Add the following required API keys inside it:
    echo.
    echo EMAIL_USER=your_email@gmail.com
    echo EMAIL_PASS=your_google_app_password
    echo MONGO_URI=mongodb+srv://...
    echo GEMINI_API_KEY=AIzaSy...
    echo.
    echo Once created, close this window and run this script again.
    pause
    exit /b
)

color 0A
echo [SUCCESS] .env file found!
echo.
echo Installing required packages (this might take a few minutes)...
call npm install
call npm run install-all

:: Step 2: Run Pre-Flight Diagnostics
color 0E
node server/diagnostic.js

:: Check if diagnostic.js crashed (exit code 1)
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo[CRITICAL ERROR] Diagnostics failed. The server will not start.
    pause
    exit /b
)

:: Step 3: Launch the Application
color 0A
echo.
echo Launching Servers (Backend on 5000, Frontend on 3000)...
call npm start

pause