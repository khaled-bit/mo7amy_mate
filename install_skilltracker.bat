@echo off
REM SkillTracker Installation Script

REM 1. Install Node.js dependencies
if exist package.json (
  echo Installing Node.js dependencies...
  npm install
) else (
  echo package.json not found! Please run this script from the project root.
  exit /b 1
)

REM 2. Install global dependencies if needed (uncomment if you want to install pnpm or other tools)
REM npm install -g pnpm

REM 3. Prompt for DATABASE_URL
set /p DATABASE_URL=Enter your PostgreSQL DATABASE_URL (e.g. from Neon): 
if "%DATABASE_URL%"=="" (
  echo DATABASE_URL is required!
  exit /b 1
)

REM 4. Write .env file
(echo DATABASE_URL=%DATABASE_URL%) > .env

REM 5. Run migrations (using latest_schema.sql)
echo Running database migrations...
psql "%DATABASE_URL%" -f migrations\latest_schema.sql
if errorlevel 1 (
  echo Migration failed! Please check your database connection and try again.
  exit /b 1
)

REM 6. (Optional) Seed the database
echo Seeding database...
npx tsx server/seed.ts

REM 7. Start the app
echo Starting the SkillTracker app...
npm run dev

pause 