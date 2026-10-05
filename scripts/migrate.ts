// Aplica as migrações SQL de ./drizzle no banco de DATABASE_URL.
// Uso: npm run db:migrate   (em produção: DATABASE_URL do Neon no ambiente)
//
// Com --somente-producao (usado no build da Vercel): só migra quando
// VERCEL_ENV=production. Previews compartilham o mesmo banco e não devem
// alterar o schema. Migrações já aplicadas são ignoradas (idempotente).
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { MIGRATIONS_FOLDER, createMigratedPgliteDb, createNeonDb, isPostgresUrl } from '../src/lib/db/client';

const url = process.env.DATABASE_URL;

if (process.argv.includes('--somente-producao') && process.env.VERCEL_ENV !== 'production') {
  console.log(`Migração ignorada (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'local'}).`);
} else if (isPostgresUrl(url)) {
  const db = createNeonDb(url) as unknown as NeonHttpDatabase;
  await migrateNeon(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log('Migrações aplicadas no Postgres (Neon).');
} else if (process.env.VERCEL_ENV === 'production') {
  // Nunca "migrar" um banco embutido em produção: falha o build.
  console.error('DATABASE_URL do Postgres ausente em produção.');
  process.exit(1);
} else {
  await createMigratedPgliteDb(url);
  console.log(`Migrações aplicadas no PGlite local (${url || 'memória'}).`);
}
