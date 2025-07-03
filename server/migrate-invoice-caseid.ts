import { Pool } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ connectionString });

async function migrateCaseId() {
  try {
    console.log("Making invoices.case_id nullable...");
    
    // Make the case_id column nullable
    await pool.query('ALTER TABLE "invoices" ALTER COLUMN "case_id" DROP NOT NULL');
    
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateCaseId().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
}); 