import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const contextResult = await client.query("SELECT current_database() AS db, current_schema() AS schema");
  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
  );

  console.log(contextResult.rows[0]);
  console.log(result.rows.map((row) => row.table_name));
} finally {
  await client.end();
}
