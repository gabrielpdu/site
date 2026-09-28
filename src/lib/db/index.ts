import { DATABASE_URL } from 'astro:env/server';
import { createMigratedPgliteDb, createNeonDb, isPostgresUrl, type Db } from './client';

// Instância única por processo (reaproveitada entre requisições na Vercel).
// No dev com PGlite as migrações são aplicadas automaticamente na 1ª conexão.
if (import.meta.env.PROD && !isPostgresUrl(DATABASE_URL)) {
  // Nunca cair silenciosamente num banco em memória em produção.
  throw new Error('DATABASE_URL deve apontar para o Postgres (Neon) em produção.');
}

export const db: Db = isPostgresUrl(DATABASE_URL)
  ? createNeonDb(DATABASE_URL)
  : await createMigratedPgliteDb(DATABASE_URL);
