import { randomUUID } from "node:crypto";
import pg from "pg";

let pool = null;
let pglite = null;
let usingPglite = false;

export function isPglite() {
  return usingPglite;
}

export async function connectDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (url && url.startsWith("postgres")) {
    const needsSsl =
      process.env.PGSSL === "true" ||
      (process.env.NODE_ENV === "production" && !/localhost|127\.0\.0\.1/.test(url));
    pool = new pg.Pool({
      connectionString: url,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
    usingPglite = false;
    await pool.query("SELECT 1");
    return { kind: "postgres" };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  pglite = new PGlite(process.env.PGLITE_DATA_DIR || undefined);
  usingPglite = true;
  return { kind: "pglite" };
}

function normalize(result) {
  return {
    rows: result.rows ?? [],
    rowCount: result.rowCount ?? result.rows?.length ?? 0,
  };
}

export async function query(text, params = []) {
  if (usingPglite) {
    return normalize(await pglite.query(text, params));
  }
  return normalize(await pool.query(text, params));
}

export async function withTransaction(fn) {
  if (usingPglite) {
    await query("BEGIN");
    try {
      const result = await fn({ query });
      await query("COMMIT");
      return result;
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn({
      query: (text, params = []) => client.query(text, params).then(normalize),
    });
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function newId() {
  return randomUUID();
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (pglite) {
    await pglite.close();
    pglite = null;
  }
}
