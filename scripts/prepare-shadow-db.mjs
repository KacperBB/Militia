import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const adminUrl = process.env.SHADOW_DATABASE_ADMIN_URL ?? "postgresql://postgres:root@localhost:5432/postgres";
const shadowDatabaseName = process.env.SHADOW_DATABASE_NAME ?? "militia_shadow";

const client = new Client({ connectionString: adminUrl });

try {
  await client.connect();
  const existsResult = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [shadowDatabaseName]);

  if (existsResult.rowCount === 0) {
    await client.query(`CREATE DATABASE ${shadowDatabaseName}`);
    console.log(`Created shadow database: ${shadowDatabaseName}`);
  } else {
    console.log(`Shadow database already exists: ${shadowDatabaseName}`);
  }
} finally {
  await client.end();
}
