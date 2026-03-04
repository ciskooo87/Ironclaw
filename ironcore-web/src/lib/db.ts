import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL não configurado");
  return p.query<T>(sql, params);
}
