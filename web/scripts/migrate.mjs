// Cria as tabelas no banco (idempotente). Roda antes do build na Vercel.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.log('[migrate] DATABASE_URL não definido: pulando a criação das tabelas.');
  process.exit(0);
}
const local = /localhost|127\.0\.0\.1/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
await client.connect();
await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
await client.end();
console.log('[migrate] Tabelas prontas.');
