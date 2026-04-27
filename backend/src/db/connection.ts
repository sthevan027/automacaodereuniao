import { Pool } from "pg";
import { getEnv } from "../config/env";

const env = getEnv();

export const pool = new Pool({
  connectionString: env.DATABASE_URL
});

export async function healthcheckDb(): Promise<void> {
  await pool.query("select 1 as ok");
}

