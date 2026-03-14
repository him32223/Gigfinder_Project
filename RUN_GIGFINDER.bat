@echo off
color 0B
echo =======================================================
echo        🎸 GigFinder - One-Click Start Script 🎸
echo =======================================================
echo.

:: Step 1: Check if the .env file exists in the server folder
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

:: Step 2: Install dependencies and run
color 0A
echo[SUCCESS] .env file found!
echo.
echo Installing required packages (this might take a minute)...
call npm install
call npm run install-all

echo.
echo 🚀 Launching Servers (Backend on 5000, Frontend on 3000)...
call npm start

pause