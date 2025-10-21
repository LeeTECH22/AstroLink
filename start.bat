@echo off
echo Installing NASA Data Explorer...
echo.

echo Installing frontend dependencies...
call npm install

echo.
echo Installing backend dependencies...
cd server
call npm install
cd ..

echo.
echo Starting NASA Data Explorer...
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:5000
echo.

start cmd /k "cd server && npm start"
timeout /t 3 /nobreak > nul
npm run dev

pause