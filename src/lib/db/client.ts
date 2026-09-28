// Fábrica de conexão sem dependência de `astro:*`, para ser usada tanto pelo
// site quanto por scripts (migração, seed) e testes.
//
// - `postgres://` / `postgresql://` → Neon (driver HTTP serverless) — produção.
// - qualquer outro valor → PGlite (Postgres embutido) — desenvolvimento local,
//   sem precisar criar conta em nenhum serviço. Vazio/`memory://` = em memória.
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import * as schema from './schema';

// Tipo comum aos dois drivers (Neon HTTP e PGlite).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

export const MIGRATIONS_FOLDER = './drizzle';

export function isPostgresUrl(url: string | undefined): url is string {
  return Boolean(url && /^postgres(ql)?:\/\//.test(url));
}

export function createNeonDb(url: string): Db {
  return drizzleNeon({ client: neon(url), schema });
}

/** Cria o banco PGlite e aplica as migrações (usado no dev e nos testes). */
export async function createMigratedPgliteDb(url?: string): Promise<Db> {
  // Import dinâmico: o PGlite (WASM) não é carregado em produção.
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ]);
  const dir = (url ?? '').replace(/^file:/, '').trim();
  const emMemoria = !dir || dir === 'memory://';
  if (!emMemoria) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dir, { recursive: true });
  }
  const client = emMemoria ? new PGlite() : new PGlite(dir);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
