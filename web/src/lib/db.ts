import 'server-only';
import { Pool, PoolClient, QueryResultRow } from 'pg';

/**
 * Conexão com o Postgres (Neon na Vercel). Uma pool por instância da função,
 * reaproveitada entre requisições.
 */
const g = globalThis as unknown as { __pool?: Pool };

function pool(): Pool {
  if (!g.__pool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL não configurado.');
    const local = /localhost|127\.0\.0\.1/.test(url);
    g.__pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10_000 });
  }
  return g.__pool;
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query('begin');
    const out = await fn(c);
    await c.query('commit');
    return out;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
