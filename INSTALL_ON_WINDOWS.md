# SkillTracker Installation Guide (Windows)

This guide will help you install and run the SkillTracker application on a new Windows machine.

## Prerequisites
- **Node.js** (v18 or later recommended): [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (local or cloud, e.g. Neon)
- **psql** command-line tool (included with PostgreSQL)

## Quick Install (Recommended)
1. **Clone the repository** and open a terminal in the project root.
2. **Run the batch installer:**
   ```
   install_skilltracker.bat
   ```
   - You will be prompted to enter your `DATABASE_URL` (PostgreSQL connection string).
   - The script will install dependencies, set up the database, run migrations, seed data, and start the app.

---

## Manual Installation Steps

1. **Install dependencies:**
   ```
   npm install
   ```
2. **Set up environment variables:**
   - Create a file named `.env` in the project root:
     ```
     DATABASE_URL=your_postgres_connection_string
     ```
3. **Run database migrations:**
   ```
   psql "%DATABASE_URL%" -f migrations/latest_schema.sql
   ```
4. **Seed the database (optional):**
   ```
   npx tsx server/seed.ts
   ```
5. **Start the app:**
   ```
   npm run dev
   ```
6. **Open your browser:**
   - Go to [http://localhost:5000](http://localhost:5000)

---

## Notes
- If you use a cloud database (like Neon), make sure to allow connections from your IP.
- The batch script and this guide assume you have `psql` in your PATH. If not, add it or run the migration step manually from the PostgreSQL bin directory.
- For production, review `.env` and security settings.

---

For any issues, please contact the project maintainer. 