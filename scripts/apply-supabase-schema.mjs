import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const schemaUrl = new URL("../database/supabase/001_current_schema.sql", import.meta.url);
const sql = await readFile(schemaUrl, "utf8");
const statements = sql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log(`Applied ${statements.length} Supabase schema statements.`);
} finally {
  await pool.end();
}
