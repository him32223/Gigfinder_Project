@echo off
echo ==========================================
echo Starting GigFinder Live Music System...
echo Please wait while dependencies install...
echo ==========================================
call npm install
call npm run install-all
echo Starting Servers...
call npm start
pause