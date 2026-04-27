import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "./connection";

async function ensureMigrationsTable() {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      run_at timestamptz not null default now()
    );
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  const dir = path.join(__dirname, "migrations");
  const files = await readdir(dir);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function alreadyRan(id: string): Promise<boolean> {
  const res = await pool.query("select 1 from schema_migrations where id = $1", [
    id
  ]);
  return (res.rowCount ?? 0) > 0;
}

async function runMigration(id: string, sql: string) {
  await pool.query(sql);
  await pool.query("insert into schema_migrations (id) values ($1)", [id]);
}

async function main() {
  await ensureMigrationsTable();
  const files = await listMigrationFiles();
  for (const file of files) {
    if (await alreadyRan(file)) continue;
    const full = path.join(__dirname, "migrations", file);
    const sql = await readFile(full, "utf8");
    await runMigration(file, sql);
    console.log(`Migration aplicada: ${file}`);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

