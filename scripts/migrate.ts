// Aplica as migrações SQL de ./drizzle no banco de DATABASE_URL.
// Uso: npm run db:migrate   (em produção: DATABASE_URL do Neon no ambiente)
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { MIGRATIONS_FOLDER, createMigratedPgliteDb, createNeonDb, isPostgresUrl } from '../src/lib/db/client';

const url = process.env.DATABASE_URL;

if (isPostgresUrl(url)) {
  const db = createNeonDb(url) as unknown as NeonHttpDatabase;
  await migrateNeon(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log('Migrações aplicadas no Postgres (Neon).');
} else {
  await createMigratedPgliteDb(url);
  console.log(`Migrações aplicadas no PGlite local (${url || 'memória'}).`);
}
